const { Article, Author, prisma } = require("./article");
const { Material, MaterialCategory } = require("./material");
const { Process } = require("./process");
const { Characterization } = require("./characterization");
const { ExtractionTask, PromptTemplate } = require("./extraction");

module.exports = {
  Article,
  Author,
  Material,
  MaterialCategory,
  Process,
  Characterization,
  ExtractionTask,
  PromptTemplate,
  prisma,
};