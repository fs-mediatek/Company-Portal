import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MyDevicesClient } from "@/components/helpdesk/my-devices-client"

export default async function MyDevicesPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <MyDevicesClient />
}
