"use client";

import { OrganizationOnboarding } from "@/components/organization/OrganizationOnboarding";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/context/OrganizationContext";

export default function NewOrganizationPage() {
    const router = useRouter();
    const { refreshOrganization } = useOrganization();

    const handleComplete = async () => {
        await refreshOrganization();
        router.push("/dashboard");
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <OrganizationOnboarding onComplete={handleComplete} />
        </div>
    );
}
