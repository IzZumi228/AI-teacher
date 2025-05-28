import { getSubjectColor } from "@/lib/utils"
import { Companion } from "@/types"

const CompanionComponent = ({companion, userName, userImage} : {companion: Companion, userName: string, userImage: string}) => {
  return (
    <section className="flex flex-col h-[70vh]">
        <section className="flex gap-8 max-sm:flex-col">
            <div className="companion-session">
                <div className="companion-avatar" style={{ backgroundColor: getSubjectColor(companion.subject) }}>

                </div>
            </div>
        </section>
    </section>
  )
}

export default CompanionComponent