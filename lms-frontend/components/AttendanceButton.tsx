import React from "react";

type AttendanceButtonProps = {
    status?: "Present" | "Absent";
};

export default function AttendanceButton({ status = "Present" }: AttendanceButtonProps): JSX.Element {
    const isPresent = status === "Present";
    return (
        <div className={`border-2 rounded-full p-1 flex gap-2 ${isPresent ? "border-green-500" : "border-red-500"} transition-colors duration-500`}>
            {/* Circle */}
            <div className={`${isPresent ? "bg-green-500" : "bg-red-500 translate-x-[300%]"} transition-all duration-500 rounded-full h-4 w-4`}></div>
            <div className={`${isPresent ? "text-green-500" : "text-red-500 -translate-x-[50%]"} transition-colors duration-500`}>{isPresent ? "Present" : "Absent"}</div>
        </div>
    );
}
