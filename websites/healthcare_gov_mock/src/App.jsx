import React from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { RouteFocus, RouteLink, Missing } from './ui'
import { Overview, Applications, ApplicationDetail, Eligibility } from './account'
import { NewApplication, EditApplication } from './application-form'
import { Catalog, ApplicationPlans, PlanDetail, PlanReview, Receipt } from './plans'
import { ReportIncome } from './income'

function Shell() {
  const { state } = useStore()
  return <>
    <a className="skip-link" href="#content" onClick={(event) => {
      event.preventDefault()
      const main = document.getElementById('content')
      main?.focus()
      main?.scrollIntoView()
    }}>Skip to main content</a>
    <header>
      <div className="masthead"><div className="shell-width masthead-inner">
        <RouteLink className="wordmark" to="/">HealthCare.gov</RouteLink>
        <span className="account-name"><span className="account-dot" aria-hidden="true" />{state.account?.fullName || 'Marketplace account'}</span>
      </div></div>
      <nav className="primary-nav" aria-label="Account"><div className="shell-width nav-inner">
        <RouteLink nav end to="/">Overview</RouteLink>
        <RouteLink nav to="/applications">Applications</RouteLink>
        <RouteLink nav to="/plans">Plans</RouteLink>
      </div></nav>
    </header>
    <RouteFocus />
    <main id="content" className="container" tabIndex="-1"><Outlet /></main>
    <footer className="shell-width footer"><span>HealthCare.gov</span><span>Marketplace account</span></footer>
  </>
}

export function App() {
  return <Routes><Route element={<Shell />}>
    <Route index element={<Overview />} />
    <Route path="applications" element={<Applications />} />
    <Route path="applications/new" element={<NewApplication />} />
    <Route path="applications/:applicationId" element={<ApplicationDetail />} />
    <Route path="applications/:applicationId/edit" element={<EditApplication />} />
    <Route path="applications/:applicationId/eligibility/:resultId?" element={<Eligibility />} />
    <Route path="applications/:applicationId/report-income" element={<ReportIncome />} />
    <Route path="plans" element={<Catalog />} />
    <Route path="applications/:applicationId/plans" element={<ApplicationPlans />} />
    <Route path="applications/:applicationId/plans/:planId" element={<PlanDetail />} />
    <Route path="applications/:applicationId/plans/:planId/review" element={<PlanReview />} />
    <Route path="applications/:applicationId/selections/:selectionId" element={<Receipt />} />
    <Route path="*" element={<Missing />} />
  </Route></Routes>
}
