import { redirect } from "next/navigation";

export default function Route53IndexPage() {
  redirect("/route53/dashboard");
}
