import type { Types } from "mongoose";

import { CurriculumCourse } from "../models/curriculum-course.model";
import { Document, toDocumentResponse, type DocumentDocument } from "../models/document.model";
import { Folder, toFolderResponse, type FolderDocument } from "../models/folder.model";
import { Major, toMajorResponse } from "../models/major.model";
import { Subject, toSubjectResponse } from "../models/subject.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import { listSharedWithMe, resolveDriveParentAccess } from "./share.service";
import { computePermanentDeleteAt } from "./trash-purge.service";

type DocumentSource = "owned" | "shared" | "public";
type PublicMatchType = "exact_course" | "same_subject_other_semester" | "global_public";

export interface ListDocumentsOptions {
  view: "my" | "shared" | "public" | "starred" | "trash";
  parentId?: string | null | undefined;
  page: number;
  limit: number;
  search?: string | undefined;
  sort: "newest" | "oldest" | "title";
  majorId?: string | undefined;
  semesterNumber?: number | undefined;
  subjectId?: string | undefined;
  match: "auto" | "exact" | "related" | "all";
}

interface ShareLike {
  id: string;
  resourceType: "folder" | "document";
  resourceId: string;
  ownerId: string;
  sharedWithUserId: string;
  permission: "read";
  sharedAt: Date;
}

interface SerializeOptions {
  source: DocumentSource;
  shareByDocumentId?: Map<string, ShareLike>;
  matchTypeByDocumentId?: Map<string, PublicMatchType>;
  includePermanentDeleteAt?: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortSpec(sort: ListDocumentsOptions["sort"]) {
  if (sort === "oldest") return { createdAt: 1 as const, _id: 1 as const };
  if (sort === "title") return { title: 1 as const, _id: 1 as const };
  return { createdAt: -1 as const, _id: -1 as const };
}

function applySearch(filter: Record<string, unknown>, search?: string): void {
  if (search?.trim()) {
    filter.title = { $regex: escapeRegex(search.trim()), $options: "i" };
  }
}

function shareResponse(share: ShareLike) {
  return {
    id: share.id,
    resourceType: share.resourceType,
    resourceId: share.resourceId,
    ownerId: share.ownerId,
    sharedWithUserId: share.sharedWithUserId,
    permission: share.permission,
    sharedAt: share.sharedAt,
  };
}

async function serializeDocuments(
  documents: DocumentDocument[],
  options: SerializeOptions,
) {
  const courseIds = documents
    .map((document) => document.curriculumCourseId?.toString())
    .filter((id): id is string => Boolean(id));
  const ownerIds = [...new Set(documents.map((document) => document.ownerId.toString()))];

  const courses = await CurriculumCourse.find({ _id: { $in: courseIds } });
  const majorIds = [...new Set(courses.map((course) => course.majorId.toString()))];
  const subjectIds = [...new Set(courses.map((course) => course.subjectId.toString()))];

  const [majors, subjects, owners] = await Promise.all([
    Major.find({ _id: { $in: majorIds } }),
    Subject.find({ _id: { $in: subjectIds } }),
    User.find({ _id: { $in: ownerIds } }).select("_id displayName email avatarUrl"),
  ]);

  const courseMap = new Map(courses.map((course) => [course._id.toString(), course]));
  const majorMap = new Map(majors.map((major) => [major._id.toString(), toMajorResponse(major)]));
  const subjectMap = new Map(
    subjects.map((subject) => [subject._id.toString(), toSubjectResponse(subject)]),
  );
  const ownerMap = new Map(
    owners.map((owner) => [
      owner._id.toString(),
      {
        id: owner._id.toString(),
        displayName: owner.displayName,
        email: owner.email,
        avatarUrl: owner.avatarUrl ?? null,
      },
    ]),
  );

  return documents.map((document) => {
    const course = document.curriculumCourseId
      ? courseMap.get(document.curriculumCourseId.toString())
      : undefined;
    const base = {
      ...toDocumentResponse(document),
      source: options.source,
      owner: ownerMap.get(document.ownerId.toString()) ?? null,
      curriculumCourse: course
        ? {
            id: course._id.toString(),
            semesterNumber: course.semesterNumber,
            major: majorMap.get(course.majorId.toString()) ?? null,
            subject: subjectMap.get(course.subjectId.toString()) ?? null,
          }
        : null,
      share: options.shareByDocumentId?.has(document._id.toString())
        ? shareResponse(options.shareByDocumentId.get(document._id.toString())!)
        : null,
      matchType:
        options.matchTypeByDocumentId?.get(document._id.toString()) ?? null,
    };

    if (!options.includePermanentDeleteAt) {
      return base;
    }

    return {
      ...base,
      permanentDeleteAt: document.deletedAt
        ? computePermanentDeleteAt(document.deletedAt)
        : null,
    };
  });
}

function serializeFolders(
  folders: FolderDocument[],
  options?: { includePermanentDeleteAt?: boolean },
) {
  return folders.map((folder) => ({
    ...toFolderResponse(folder),
    ...(options?.includePermanentDeleteAt
      ? {
          permanentDeleteAt: folder.deletedAt
            ? computePermanentDeleteAt(folder.deletedAt)
            : null,
        }
      : {}),
  }));
}

async function listMyDocuments(user: UserDocument, options: ListDocumentsOptions) {
  const parentId = options.parentId ? parseObjectId(options.parentId, "parentId") : null;
  const folderFilter: Record<string, unknown> = {
    ownerId: user._id,
    parentId,
    deletedAt: null,
  };
  const documentFilter: Record<string, unknown> = {
    ownerId: user._id,
    folderId: parentId,
    deletedAt: null,
  };
  if (options.search) {
    folderFilter.name = { $regex: escapeRegex(options.search), $options: "i" };
    applySearch(documentFilter, options.search);
  }

  const [folders, documents] = await Promise.all([
    Folder.find(folderFilter).sort({ name: 1 }),
    Document.find(documentFilter).sort(sortSpec(options.sort)),
  ]);

  return {
    folders: serializeFolders(folders),
    documents: await serializeDocuments(documents, { source: "owned" }),
  };
}

async function listSharedDocuments(user: UserDocument, options: ListDocumentsOptions) {
  if (options.parentId) {
    const parentId = parseObjectId(options.parentId, "parentId");
    const { contentOwnerId } = await resolveDriveParentAccess(user._id, parentId);
    const [folders, documents] = await Promise.all([
      Folder.find({ ownerId: contentOwnerId, parentId, deletedAt: null }).sort({ name: 1 }),
      Document.find({ ownerId: contentOwnerId, folderId: parentId, deletedAt: null }).sort(
        sortSpec(options.sort),
      ),
    ]);
    return {
      folders: serializeFolders(folders),
      documents: await serializeDocuments(documents, { source: "shared" }),
    };
  }

  const items = await listSharedWithMe(user);
  const folders = items
    .filter((item) => item.resource?.type === "folder")
    .map((item) => (item.resource as { type: "folder"; data: ReturnType<typeof toFolderResponse> }).data);
  const documentItems = items.filter((item) => item.resource?.type === "document");
  const documentIds = documentItems.map((item) => item.resource!.data.id);
  const documentFilter: Record<string, unknown> = {
    _id: { $in: documentIds.map((id) => parseObjectId(id)) },
    deletedAt: null,
  };
  applySearch(documentFilter, options.search);

  const shareByDocumentId = new Map<string, ShareLike>();
  for (const item of documentItems) {
    if (item.resource?.type !== "document") continue;
    shareByDocumentId.set(item.resource.data.id, item.share as ShareLike);
  }

  const documents = await Document.find(documentFilter).sort(sortSpec(options.sort));
  return {
    folders,
    documents: await serializeDocuments(documents, {
      source: "shared",
      shareByDocumentId,
    }),
  };
}

async function listStarredDocuments(user: UserDocument, options: ListDocumentsOptions) {
  const [folders, documents] = await Promise.all([
    Folder.find({ ownerId: user._id, isStarred: true, deletedAt: null }).sort({ updatedAt: -1 }),
    Document.find({ ownerId: user._id, isStarred: true, deletedAt: null }).sort(
      sortSpec(options.sort),
    ),
  ]);
  return {
    folders: serializeFolders(folders),
    documents: await serializeDocuments(documents, { source: "owned" }),
  };
}

async function listTrashDocuments(user: UserDocument, options: ListDocumentsOptions) {
  const [folders, documents] = await Promise.all([
    Folder.find({ ownerId: user._id, deletedAt: { $ne: null } }).sort({ deletedAt: -1 }),
    Document.find({ ownerId: user._id, deletedAt: { $ne: null } }).sort(sortSpec(options.sort)),
  ]);
  return {
    folders: serializeFolders(folders, { includePermanentDeleteAt: true }),
    documents: await serializeDocuments(documents, {
      source: "owned",
      includePermanentDeleteAt: true,
    }),
  };
}

async function getCourseIdsForFilter(options: ListDocumentsOptions): Promise<Types.ObjectId[] | null> {
  const filter: Record<string, unknown> = { isActive: true };
  if (options.majorId) filter.majorId = parseObjectId(options.majorId, "majorId");
  if (options.semesterNumber !== undefined) filter.semesterNumber = options.semesterNumber;
  if (options.subjectId) filter.subjectId = parseObjectId(options.subjectId, "subjectId");

  if (Object.keys(filter).length === 1) {
    return null;
  }

  return CurriculumCourse.find(filter).distinct("_id");
}

async function getProfileCourseBuckets(user: UserDocument) {
  if (!user.majorId || !user.currentSemester || user.currentSubjectIds.length === 0) {
    return { exactCourseIds: [] as Types.ObjectId[], relatedCourseIds: [] as Types.ObjectId[] };
  }

  const exactCourses = await CurriculumCourse.find({
    majorId: user.majorId,
    semesterNumber: user.currentSemester,
    subjectId: { $in: user.currentSubjectIds },
    isActive: true,
  }).select("_id subjectId");

  const exactCourseIds = exactCourses.map((course) => course._id);
  const subjectIds = [...new Set(exactCourses.map((course) => course.subjectId.toString()))];
  const relatedCourseIds =
    subjectIds.length === 0
      ? []
      : await CurriculumCourse.find({
          majorId: user.majorId,
          subjectId: { $in: subjectIds.map((id) => parseObjectId(id, "subjectId")) },
          semesterNumber: { $ne: user.currentSemester },
          isActive: true,
        }).distinct("_id");

  return { exactCourseIds, relatedCourseIds };
}

function matchTypeForDocument(
  document: DocumentDocument,
  exactCourseIds: Types.ObjectId[],
  relatedCourseIds: Types.ObjectId[],
): PublicMatchType {
  const courseId = document.curriculumCourseId;
  if (courseId && exactCourseIds.some((id) => id.equals(courseId as Types.ObjectId))) {
    return "exact_course";
  }
  if (courseId && relatedCourseIds.some((id) => id.equals(courseId as Types.ObjectId))) {
    return "same_subject_other_semester";
  }
  return "global_public";
}

async function listPublicDocuments(user: UserDocument, options: ListDocumentsOptions) {
  const { exactCourseIds, relatedCourseIds } = await getProfileCourseBuckets(user);
  const filteredCourseIds = await getCourseIdsForFilter(options);
  const filter: Record<string, unknown> = {
    visibility: "public",
    deletedAt: null,
    status: { $ne: "pending" },
    curriculumCourseId: { $ne: null },
  };
  applySearch(filter, options.search);

  if (filteredCourseIds) {
    filter.curriculumCourseId = { $in: filteredCourseIds };
  } else if (options.match === "exact") {
    filter.curriculumCourseId = { $in: exactCourseIds };
  } else if (options.match === "related") {
    filter.curriculumCourseId = { $in: relatedCourseIds };
  }

  const allMatchingDocs = await Document.find(filter).sort(sortSpec(options.sort));
  const prioritized =
    options.match === "auto"
      ? allMatchingDocs.sort((a, b) => {
          const aType = matchTypeForDocument(a, exactCourseIds, relatedCourseIds);
          const bType = matchTypeForDocument(b, exactCourseIds, relatedCourseIds);
          const rank = {
            exact_course: 0,
            same_subject_other_semester: 1,
            global_public: 2,
          } satisfies Record<PublicMatchType, number>;
          return rank[aType] - rank[bType];
        })
      : allMatchingDocs;

  const start = (options.page - 1) * options.limit;
  const documents = prioritized.slice(start, start + options.limit);
  const matchTypeByDocumentId = new Map<string, PublicMatchType>();
  for (const document of documents) {
    matchTypeByDocumentId.set(
      document._id.toString(),
      matchTypeForDocument(document, exactCourseIds, relatedCourseIds),
    );
  }

  return {
    folders: [],
    documents: await serializeDocuments(documents, {
      source: "public",
      matchTypeByDocumentId,
    }),
    pagination: {
      page: options.page,
      limit: options.limit,
      total: prioritized.length,
      totalPages: Math.ceil(prioritized.length / options.limit),
    },
  };
}

export async function listDocuments(user: UserDocument, options: ListDocumentsOptions) {
  if (options.view === "shared") return listSharedDocuments(user, options);
  if (options.view === "public") return listPublicDocuments(user, options);
  if (options.view === "starred") return listStarredDocuments(user, options);
  if (options.view === "trash") return listTrashDocuments(user, options);
  return listMyDocuments(user, options);
}
