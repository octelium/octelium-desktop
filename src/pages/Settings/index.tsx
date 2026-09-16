import PageHeader from "@/components/PageHeader";
import AppSettings from "./App";
import Domain from "./Domain";

const Settings = () => {
  return (
    <div className="w-full">
      <PageHeader
        title="Settings"
        description="The application preferences are local while the Cluster settings are owned by the Octelium daemon."
      />

      <div className="flex flex-col gap-4">
        <AppSettings />
        <Domain />
      </div>
    </div>
  );
};

export default Settings;
