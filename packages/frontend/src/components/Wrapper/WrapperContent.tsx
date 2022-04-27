import * as React from "react";

interface WrapperContentProps {
  children: React.ReactNode;
}

const WrapperContent = ({ children }: WrapperContentProps) => {
  return children;
};

export { WrapperContent };
