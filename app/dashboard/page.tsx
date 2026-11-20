import { RoleNavigation } from "@/src/components/dashboard/role-navigation";
import { EnrollMemberLink } from "@/src/components/members/enroll-member-link";
import { RegisterPaymentLink } from "@/src/components/payments/register-payment-link";
import { LogoutButton } from "../logout-button";
import { SessionInfo } from "../session-info";
import { MyMembershipLink } from "@/src/components/memberships/my-membership-link";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold">GymHub</h1>
      <SessionInfo />
      <MyMembershipLink />
      <div className="flex flex-wrap items-center justify-center gap-4">
        <RoleNavigation />
        <EnrollMemberLink />
        <RegisterPaymentLink />
        <LogoutButton />
      </div>
    </div>
  );
}
