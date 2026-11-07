import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/utils/hooks";
import { SegmentedControl } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import Clusters from "../Clusters";
import AppSettings from "./App";
import Domain from "./Domain";

type Section = "application" | "cluster" | "clusters";

const details: Record<Section, { description: string }> = {
  application: {
    description:
      "Preferences for this desktop application, independent of any Cluster.",
  },
  cluster: {
    description:
      "Connection policy for the selected Cluster. Changes apply on the next Connection.",
  },
  clusters: {
    description:
      "Add, select, sign out of, or remove Cluster domains from this device.",
  },
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const daemonAvailable = useAppSelector(
    (state) => state.daemon.availability === "available",
  );
  const requested = searchParams.get("section");
  const section: Section =
    requested === "clusters" && daemonAvailable
      ? "clusters"
      : requested === "cluster" && daemonAvailable && domain
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
      <PageHeader title="Settings" description={details[section].description} />

      <SegmentedControl
        className="mb-5"
        value={section}
        onChange={setSection}
        data={[
          { label: "Application", value: "application" },
          {
            label: "Cluster",
            value: "cluster",
            disabled: !daemonAvailable || !domain,
          },
          { label: "Clusters", value: "clusters", disabled: !daemonAvailable },
        ]}
      />

      {section === "application" && <AppSettings />}
      {section === "cluster" && (
        <div className="max-w-3xl">
          <Domain />
        </div>
      )}
      {section === "clusters" && (
        <div className="max-w-3xl">
          <Clusters embedded />
        </div>
      )}
    </div>
  );
};

export default Settings;
