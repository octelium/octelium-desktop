import CopyText from "@/components/CopyText";
import HighlightText from "@/components/HighlightText";

const ResourceName = (props: {
  name: string;
  displayName?: string;
  description?: string;
  splitNamespace?: boolean;
  copyValue?: string;
  copyLabel?: string;
  highlight?: string[];
}) => {
  const separatorIndex = props.splitNamespace ? props.name.indexOf(".") : -1;
  const resourceName =
    separatorIndex > 0 ? props.name.slice(0, separatorIndex) : props.name;
  const suffix = separatorIndex > 0 ? props.name.slice(separatorIndex) : "";
  const subtitle = [props.displayName, props.description].filter(Boolean);

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1">
        <h2 className="min-w-0 truncate text-sm font-medium text-strong">
          <HighlightText text={resourceName} tokens={props.highlight} />
          {suffix && (
            <span className="font-normal text-faint">
              <HighlightText text={suffix} tokens={props.highlight} />
            </span>
          )}
        </h2>
        <CopyText
          value={props.copyValue ?? props.name}
          label={props.copyLabel ?? "Copy name"}
          hide
        />
      </div>
      {subtitle.length > 0 && (
        <p className="truncate text-xs leading-5 text-muted">
          {subtitle.map((itm, index) => (
            <span key={index}>
              {index > 0 && (
                <span aria-hidden className="mx-1.5 text-faint">
                  ·
                </span>
              )}
              <HighlightText text={itm!} tokens={props.highlight} />
            </span>
          ))}
        </p>
      )}
    </div>
  );
};

export default ResourceName;
