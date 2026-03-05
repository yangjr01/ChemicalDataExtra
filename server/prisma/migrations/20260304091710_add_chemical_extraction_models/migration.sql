-- CreateTable
CREATE TABLE "chemical_articles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "doi" TEXT,
    "journal" TEXT,
    "publicationDate" DATETIME,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "abstract" TEXT,
    "keywords" TEXT,
    "sourceFile" TEXT,
    "workspaceDocId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "chemical_authors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "orcid" TEXT,
    "affiliation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "chemical_article_authors" (
    "articleId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "authorOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("articleId", "authorId"),
    CONSTRAINT "chemical_article_authors_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "chemical_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chemical_article_authors_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "chemical_authors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_material_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_material_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chemical_material_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_materials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT,
    "categoryId" INTEGER,
    "composition" TEXT,
    "properties" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_materials_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "chemical_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chemical_materials_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "chemical_material_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_processes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "conditions" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_processes_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "chemical_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_process_materials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processId" INTEGER NOT NULL,
    "materialId" INTEGER,
    "role" TEXT NOT NULL DEFAULT 'input',
    "quantity" TEXT,
    "unit" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_process_materials_processId_fkey" FOREIGN KEY ("processId") REFERENCES "chemical_processes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chemical_process_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "chemical_materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_process_parameters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'string',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_process_parameters_processId_fkey" FOREIGN KEY ("processId") REFERENCES "chemical_processes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_characterizations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "materialId" INTEGER,
    "processId" INTEGER,
    "technique" TEXT NOT NULL,
    "conditions" TEXT,
    "results" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_characterizations_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "chemical_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chemical_characterizations_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "chemical_materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chemical_characterizations_processId_fkey" FOREIGN KEY ("processId") REFERENCES "chemical_processes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_extraction_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "promptId" TEXT NOT NULL,
    "promptName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "rawResponse" TEXT,
    "parsedData" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_extraction_tasks_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "chemical_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_conversation_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" INTEGER,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_conversation_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "chemical_extraction_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_prompt_templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'extraction',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "chemical_articles_doi_key" ON "chemical_articles"("doi");

-- CreateIndex
CREATE INDEX "chemical_articles_doi_idx" ON "chemical_articles"("doi");

-- CreateIndex
CREATE INDEX "chemical_articles_status_idx" ON "chemical_articles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "chemical_authors_orcid_key" ON "chemical_authors"("orcid");

-- CreateIndex
CREATE INDEX "chemical_authors_name_idx" ON "chemical_authors"("name");

-- CreateIndex
CREATE INDEX "chemical_article_authors_articleId_idx" ON "chemical_article_authors"("articleId");

-- CreateIndex
CREATE INDEX "chemical_article_authors_authorId_idx" ON "chemical_article_authors"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "chemical_material_categories_name_key" ON "chemical_material_categories"("name");

-- CreateIndex
CREATE INDEX "chemical_material_categories_parentId_idx" ON "chemical_material_categories"("parentId");

-- CreateIndex
CREATE INDEX "chemical_materials_articleId_idx" ON "chemical_materials"("articleId");

-- CreateIndex
CREATE INDEX "chemical_materials_categoryId_idx" ON "chemical_materials"("categoryId");

-- CreateIndex
CREATE INDEX "chemical_materials_name_idx" ON "chemical_materials"("name");

-- CreateIndex
CREATE INDEX "chemical_processes_articleId_idx" ON "chemical_processes"("articleId");

-- CreateIndex
CREATE INDEX "chemical_processes_name_idx" ON "chemical_processes"("name");

-- CreateIndex
CREATE INDEX "chemical_process_materials_processId_idx" ON "chemical_process_materials"("processId");

-- CreateIndex
CREATE INDEX "chemical_process_materials_materialId_idx" ON "chemical_process_materials"("materialId");

-- CreateIndex
CREATE INDEX "chemical_process_materials_role_idx" ON "chemical_process_materials"("role");

-- CreateIndex
CREATE INDEX "chemical_process_parameters_processId_idx" ON "chemical_process_parameters"("processId");

-- CreateIndex
CREATE INDEX "chemical_process_parameters_name_idx" ON "chemical_process_parameters"("name");

-- CreateIndex
CREATE INDEX "chemical_characterizations_articleId_idx" ON "chemical_characterizations"("articleId");

-- CreateIndex
CREATE INDEX "chemical_characterizations_materialId_idx" ON "chemical_characterizations"("materialId");

-- CreateIndex
CREATE INDEX "chemical_characterizations_processId_idx" ON "chemical_characterizations"("processId");

-- CreateIndex
CREATE INDEX "chemical_characterizations_technique_idx" ON "chemical_characterizations"("technique");

-- CreateIndex
CREATE INDEX "chemical_extraction_tasks_articleId_idx" ON "chemical_extraction_tasks"("articleId");

-- CreateIndex
CREATE INDEX "chemical_extraction_tasks_status_idx" ON "chemical_extraction_tasks"("status");

-- CreateIndex
CREATE INDEX "chemical_extraction_tasks_promptId_idx" ON "chemical_extraction_tasks"("promptId");

-- CreateIndex
CREATE INDEX "chemical_conversation_history_taskId_idx" ON "chemical_conversation_history"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "chemical_prompt_templates_name_key" ON "chemical_prompt_templates"("name");

-- CreateIndex
CREATE INDEX "chemical_prompt_templates_category_idx" ON "chemical_prompt_templates"("category");

-- CreateIndex
CREATE INDEX "chemical_prompt_templates_isActive_idx" ON "chemical_prompt_templates"("isActive");
