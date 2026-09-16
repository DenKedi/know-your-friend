import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roomsRouter from "./rooms";
import categoriesRouter from "./categories";
import categorySuggestionsRouter from "./category-suggestions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roomsRouter);
router.use(categoriesRouter);
router.use(categorySuggestionsRouter);

export default router;
