import CompanionCard from '@/components/CompanionCard'
import CompanionsList from '@/components/CompanionsList'
import CTA from '@/components/CTA'
import { popularCompanions } from '@/constants'
import { getAllCompanions, getRecentSessions } from '@/lib/actions/companio.actions'
import { getSubjectColor } from '@/lib/utils'
import React from 'react'

const Page = async () => {
  const companions = await getAllCompanions({ limit: 3 })
  const recentSessionCompanions = await getRecentSessions(10)

  let displayCompanions: any[] = [];

   if (companions.length < 3) {
    const needed = 3 - companions.length
    const existingNames = companions.map(c => c.name)

    const fillers = popularCompanions
      .filter(pc => !existingNames.includes(pc.name))
      .slice(0, needed)

    displayCompanions = fillers
  }
  
  return (
    <main>
      <h1 className='text-2xl underline'>
        Dashboard
      </h1>

      <section className='home-section'>
        {companions.map((companion) => (
          <CompanionCard
            key={companion.id}
            {...companion}
            starter={false}
            color={getSubjectColor(companion.subject)}
          />
        ))}
        {
          displayCompanions.map((companion) => (
            <CompanionCard
              key={companion.id}
              {...companion}
              starter={true}
              color={getSubjectColor(companion.subject)}
            />
          ))
        }
      </section>

      <section className='home-section'>
        <CompanionsList
          title="Recently Completed Sessions"
          companions={recentSessionCompanions}
          classNames="w-2/3 max-lg:w-full"
        />
        <CTA />
      </section>
    </main>
  )
}

export default Page
