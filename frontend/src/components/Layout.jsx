import Sidebar from './Sidebar'
import AuroraBg from './AuroraBg'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <AuroraBg />
      <Sidebar />
      <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
