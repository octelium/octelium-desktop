import { setItemsPerPage } from "@/features/prefs/slice";
import {
  useAppDispatch,
  useAppSelector,
  useFilterParams,
} from "@/utils/hooks";
import { Select } from "@mantine/core";

const OPTIONS = ["10", "25", "50", "100"];

const PageSizeSelect = () => {
  const dispatch = useAppDispatch();
  const { setParams } = useFilterParams();
  const itemsPerPage = useAppSelector((state) => state.prefs.prefs.itemsPerPage);

  return (
    <Select
      aria-label="Items per page"
      className="w-[110px]"
      data={OPTIONS}
      value={String(itemsPerPage)}
      allowDeselect={false}
      onChange={(value) => {
        if (!value) {
          return;
        }
        dispatch(setItemsPerPage({ itemsPerPage: Number(value) }));
        setParams({});
      }}
    />
  );
};

export default PageSizeSelect;
