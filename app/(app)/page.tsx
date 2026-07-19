import { Card, CardTitle } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/auth";
import { formatApp, todayInAppTz } from "@/lib/time";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const today = todayInAppTz();

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-gray-500">
          {formatApp(`${today}T12:00:00`, "EEEE, d 'de' MMMM")}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h1>
      </header>

      <Card>
        <CardTitle>Dashboard</CardTitle>
        <p className="text-gray-600">
          Aquí irá el resumen de hoy: medicamentos y tareas pendientes, próxima
          cita, notas del día y actividad reciente.
        </p>
      </Card>
    </div>
  );
}
