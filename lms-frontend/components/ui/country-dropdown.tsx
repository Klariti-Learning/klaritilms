import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactCountryFlag from "react-country-flag";
import countryList from "react-select-country-list";
import { getCountryCallingCode, CountryCode } from "libphonenumber-js";
import {CountryDropdownProps} from "@/types";

export function CountryDropdown({
  value,
  onChange,
  slim = true,
}: CountryDropdownProps) {
  const countries = React.useMemo(() => countryList().getData(), []);

  return (
    <Select
      value={value}
      onValueChange={(isoCode: string) => {
        try {
          const dialCode = `+${getCountryCallingCode(isoCode as CountryCode)}`;
          onChange(isoCode, dialCode);
        } catch {
          onChange(isoCode, "+91");
        }
      }}
    >
      <SelectTrigger
        className={`${slim ? "w-12 p-1" : "w-44"} border-0 focus:ring-0 cursor-pointer`}
      >
        <SelectValue>
          {value && (
            <div className="flex items-center space-x-1 cursor-pointer">
              <ReactCountryFlag
                countryCode={value}
                svg
                style={{ width: "1.25em", height: "1.25em" }}
              />
              {!slim && (
                <span>{countries.find((c) => c.value === value)?.label}</span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="bg-white border border-gray-200 rounded-md shadow-lg cursor-pointer max-h-64 overflow-y-auto
          data-[state=open]:animate-[dropdown-open_200ms_ease-out] 
          data-[state=closed]:animate-[dropdown-close_200ms_ease-out]"
        style={{
          transformOrigin: "top center",
        }}
      >
        {countries.map((country: { value: string; label: string }) => {
          let dialCode = "+91";
          try {
            dialCode = `+${getCountryCallingCode(
              country.value as CountryCode
            )}`;
          } catch (error) {
            console.log(error);
          }
          return (
            <SelectItem
              key={country.value}
              value={country.value}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 focus:bg-gray-200 transition-colors duration-200 cursor-pointer"
            >
              <ReactCountryFlag
                countryCode={country.value}
                svg
                style={{ width: "1em", height: "1.25em" }}
              />
              <span>{country.label}</span>
              <span className="text-gray-500 text-sm">{dialCode}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}