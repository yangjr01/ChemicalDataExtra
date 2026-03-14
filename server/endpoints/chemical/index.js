const { Router } = require("express");
const literatureRoutes = require("./literature");
const extractionRoutes = require("./extraction");
const promptsRoutes = require("./prompts");
const dataRoutes = require("./data");
const imageExtractionRoutes = require("./image-extraction");
const allDataRoutes = require("./alldata");

const router = Router();

// 注册各模块路由
router.use("/literature", literatureRoutes);
router.use("/extraction", extractionRoutes);
router.use("/prompts", promptsRoutes);
router.use("/data", dataRoutes);
router.use("/image-extraction", imageExtractionRoutes);
router.use("/alldata", allDataRoutes);

module.exports = router;