"use client";

import type { ChangeEvent } from "react";
import Select, { components, type StylesConfig } from "react-select";
import type { DropdownProps } from "@daypicker/react";

/**
 * HANDOVER — Shared form dropdown used on Quote, Plans and Details.
 *
 * On phones, show a real HTML select to keep the OS-native picker.
 * From 640px upwards, show react-select like the existing Breed dropdown.
 * Both controls are bound to the same value/callback; CSS only switches visibility.
 * Do not replace the native control with a click overlay (it breaks mobile input).
 */
export type DropdownChoice = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

export type ResponsiveSelectProps = {
  options: DropdownChoice[];
  value: string | number;
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  disabled?: boolean;
  compact?: boolean;
  invalid?: boolean;
  searchable?: boolean;
  className?: string;
};

function Chevron() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const makeSelectStyles = (compact: boolean, invalid: boolean): StylesConfig<DropdownChoice, false> => {
  const height = compact ? 40 : 48;
  return {
    control: (base, state) => ({
      ...base,
      minHeight: height,
      height,
      borderRadius: 12,
      border: `1px solid ${invalid ? "#ef4444" : "#d1d5db"}`,
      backgroundColor: state.isDisabled ? "#f3f4f6" : "#fff",
      boxShadow: state.isFocused ? `0 0 0 2px ${invalid ? "#ef4444" : "#1f2937"}` : "none",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      "&:hover": { borderColor: invalid ? "#ef4444" : "#9ca3af" },
      fontFamily: "inherit",
    }),
    valueContainer: (base) => ({ ...base, height, padding: "0 10px", fontSize: 14 }),
    singleValue: (base, state) => ({
      ...base,
      color: state.isDisabled ? "#6b7280" : "#111827",
      fontFamily: "inherit",
      fontSize: 14,
      fontWeight: 500,
    }),
    input: (base) => ({ ...base, fontSize: 14, fontFamily: "inherit", color: "#111827" }),
    indicatorsContainer: (base) => ({ ...base, height }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({ ...base, padding: "0 8px", color: "#555" }),
    menu: (base) => ({
      ...base,
      borderRadius: 12,
      overflow: "hidden",
      zIndex: 50,
      boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      fontFamily: "inherit",
      fontSize: 14,
      color: "#111827",
      backgroundColor: state.isFocused ? "#f3f4f6" : "#fff",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      padding: "10px 12px",
    }),
  };
};

export function ResponsiveSelect({
  options,
  value,
  onChange,
  ariaLabel,
  id,
  disabled = false,
  compact = false,
  invalid = false,
  searchable = false,
  className = "",
}: ResponsiveSelectProps) {
  const selectedOption = options.find((option) => option.value === String(value)) ?? null;

  return (
    <div className={className}>
      {/* Mobile: native select opens the device's own picker. */}
      <div className="relative sm:hidden">
        <select
          id={id ? `${id}-mobile` : undefined}
          aria-label={ariaLabel}
          value={String(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          className={`w-full appearance-none rounded-xl border ${invalid ? "border-red-500" : "border-gray-300"} pl-3 pr-9 text-sm font-medium
            text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800
            ${compact ? "h-10" : "h-12"}
            ${disabled ? "cursor-not-allowed bg-gray-100 text-gray-500" : "cursor-pointer bg-white"}
            ${invalid ? "focus:ring-red-500" : ""}`}
          style={{ fontFamily: "inherit" }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.isDisabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#555]">
          <Chevron />
        </span>
      </div>

      {/* Desktop: matches the custom Breed dropdown menu. */}
      <div className="hidden sm:block">
        <Select<DropdownChoice, false>
          inputId={id}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          options={options}
          value={selectedOption}
          onChange={(choice) => { if (choice) onChange(choice.value); }}
          isDisabled={disabled}
          isSearchable={searchable}
          isClearable={false}
          styles={makeSelectStyles(compact, invalid)}
          menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
          menuPosition="fixed"
          components={{
            IndicatorSeparator: () => null,
            DropdownIndicator: (props) => (
              <components.DropdownIndicator {...props}><Chevron /></components.DropdownIndicator>
            ),
          }}
        />
      </div>
    </div>
  );
}

/** Adapter: DayPicker emits a native select change event for month/year navigation. */
export function CalendarDropdown(props: DropdownProps) {
  const { options = [], value, onChange, "aria-label": label } = props;
  const isYear = (label ?? "").toLowerCase().includes("year");
  return (
    <ResponsiveSelect
      ariaLabel={label ?? (isYear ? "Choose year" : "Choose month")}
      compact
      searchable={isYear}
      className={isYear ? "w-[87px] sm:w-[104px]" : "w-[110px] sm:w-[128px]"}
      options={options.map((option) => ({
        value: String(option.value),
        label: String(option.label),
        isDisabled: option.disabled,
      }))}
      value={value ?? ""}
      onChange={(newValue) => {
        if (!onChange) return;
        // DayPicker expects a ChangeEvent<HTMLSelectElement>, not just a string.
        onChange({ target: { value: newValue } } as ChangeEvent<HTMLSelectElement>);
      }}
    />
  );
}
