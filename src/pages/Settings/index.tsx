import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/utils/hooks";
import { SegmentedControl } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import Clusters from "../Clusters";
import AppSettings from "./App";
import Domain from "./Domain";

type Section = "application" | "cluster" | "clusters";

const details: Record<Section, { title: string; description: string }> = {
  application: {
    title: "Application settings",
    description:
      "Preferences for this desktop application, independent of any Cluster.",
  },
  cluster: {
    title: "Cluster settings",
    description:
      "Connection policy for the selected Cluster. Changes apply on the next Connection.",
  },
  clusters: {
    title: "Manage Clusters",
    description:
      "Add, select, sign out of, or remove Cluster domains from this device.",
  },
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const requested = searchParams.get("section");
  const section: Section =
    requested === "clusters"
      ? "clusters"
      : requested === "cluster" && domain
        ? "cluster"
        : "application";

  const setSection = (value: string) => {
    setSearchParams(
      value === "application" ? {} : { section: value },
      { replace: true },
    );
  };

  return (
    <div className="w-full">
      <PageHeader
        title={details[section].title}
        description={details[section].description}
      />

      <SegmentedControl
        fullWidth
        className="mb-5 max-w-xl"
        value={section}
        onChange={setSection}
        data={[
          { label: "Application", value: "application" },
          { label: "Cluster", value: "cluster", disabled: !domain },
          { label: "Clusters", value: "clusters" },
        ]}
      />

      {section === "application" && <AppSettings />}
      {section === "cluster" && <Domain />}
      {section === "clusters" && <Clusters embedded />}
    </div>
  );
};

export default Settings;
