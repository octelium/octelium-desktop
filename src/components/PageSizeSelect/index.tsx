import { setItemsPerPage } from "@/features/prefs/slice";
import {
  useAppDispatch,
  useAppSelector,
  useFilterParams,
} from "@/utils/hooks";
import { Select } from "@mantine/core";
import { useId } from "react";

const OPTIONS = ["10", "25", "50", "100"];

const PageSizeSelect = () => {
  const id = useId();
  const dispatch = useAppDispatch();
  const { setParams } = useFilterParams();
  const itemsPerPage = useAppSelector((state) => state.prefs.prefs.itemsPerPage);

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="text-xs text-muted">
        Per page
      </label>
      <Select
        id={id}
        size="xs"
        w={76}
        data={OPTIONS}
        value={String(itemsPerPage)}
        allowDeselect={false}
        styles={{ input: { minHeight: 30 } }}
        onChange={(value) => {
          if (!value) {
            return;
          }
          dispatch(setItemsPerPage({ itemsPerPage: Number(value) }));
          setParams({});
        }}
      />
    </div>
  );
};

export default PageSizeSelect;
