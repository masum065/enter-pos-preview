import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TestPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Session Test Page</h1>
      <div className="bg-green-50 p-4 rounded">
        <p className="font-semibold">✅ Session Active!</p>
        <pre className="mt-4 bg-white p-4 rounded overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}
