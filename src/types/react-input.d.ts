import "react";

declare module "react" {
  interface InputHTMLAttributes<T> {
    capture?: boolean | "user" | "environment" | undefined;
  }
}
