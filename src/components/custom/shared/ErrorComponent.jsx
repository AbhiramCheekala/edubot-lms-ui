import React from "react";

const ErrorMessage = ({ error }) => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    </div>
  );
};

const ErrorComponent = () => {
  return (
    <ErrorMessage error="An unexpected error has occurred. Please try again later." />
  );
};

export default ErrorComponent;
