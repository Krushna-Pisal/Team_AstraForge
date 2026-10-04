import React from "react";
import AuthLayout from "../components/AuthLayout";
import SignupForm from "../components/SignupForm";

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
