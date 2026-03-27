const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  listConditions,
  createCondition,
  addUserCondition,
  removeUserCondition,
  myConditions,
} = require("../controllers/condition");

router.get("/", authenticate, listConditions);
router.post("/", authenticate, requireAdmin, createCondition);
router.get("/mine", authenticate, myConditions);
router.post("/mine", authenticate, addUserCondition);
router.delete("/mine/:conditionId", authenticate, removeUserCondition);

module.exports = router;
