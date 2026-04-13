"use client";

import React, { Suspense, useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import "../post-creation-form/PostCreationForm.css";
import "./Faq.css";

const faqData = [
  // --- General & Access ---
  {
    question: "What is IITK ProjectSpace?",
    answer: "IITK ProjectSpace is the centralized hub for the IIT Kanpur community to manage academic and extracurricular portfolios, showcase innovative projects, find skilled collaborators, and streamline the campus recruitment workflow all in one place."
  },
  {
    question: "Who can access the platform?",
    answer: "The platform is strictly restricted to the IITK campus community. Initial registration and access require OTP verification using a valid @iitk.ac.in webmail address to ensure a secure, verified internal environment."
  },
  {
    question: "Can I log in using my personal Gmail account?",
    answer: "Yes, but only after your initial registration. Once your account is created using your IITK webmail, you can navigate to your 'Edit Profile' page and add a secondary email (like your personal Gmail). After verifying it, you can use the one-click Google Sign-In option on the login page."
  },
  {
    question: "What should I do if I forget my password?",
    answer: "You can easily reset it by clicking 'Forgot Password' on the login screen. You will need to enter your primary @iitk.ac.in email to receive a secure OTP, which will allow you to set a new password."
  },

  // --- Profile Management ---
  {
    question: "What details should I include in my user profile?",
    answer: "A comprehensive profile helps you stand out to recruiters and collaborators. We highly recommend adding your current degree, department, a brief bio, your technical and soft skills, and linking your GitHub, LinkedIn, and Google Scholar profiles."
  },
  {
    question: "How do recruiters evaluate my applications?",
    answer: "When you apply for an opening, recruiters receive a direct link to your live user profile. They will evaluate you based on the skills, previous projects, and social links you have showcased, so ensure your profile is up to date before applying!"
  },

  // --- Projects & Creation ---
  {
    question: "How do I create a new project or recruitment post?",
    answer: "Navigate to the 'Create' section from the sidebar. You can choose to start a 'Project' or a 'Recruitment' post. You will be able to fill in core details, assign relevant domains, and upload project media or logos."
  },
  {
    question: "Can I format my project descriptions?",
    answer: "Yes! Our editor supports rich text and markdown formatting. You can easily add headings, bulleted lists, links, and bold text to make your project descriptions highly readable and professional."
  },
  {
    question: "How do I add my teammates to a project?",
    answer: "While creating or editing a project, you can use the team management section to search for other registered IITK ProjectSpace users. Adding them links their profiles to the project, giving them credit on their personal portfolios."
  },
  {
    question: "What happens if I forget to save my changes when editing a post?",
    answer: "To prevent data loss, our edit pages support a quick-save keyboard shortcut (Ctrl+S on Windows/Linux or Cmd+S on Mac). Always ensure you click 'Save Changes' or use the shortcut before navigating away from the editor."
  },

  // --- Search & Discovery ---
  {
    question: "How does the search functionality work?",
    answer: "The platform is powered by advanced global semantic and full-text search. This means you can search by specific keywords, broad domains, or technical prerequisites to easily discover highly relevant projects, users, and open recruitments."
  },
  {
    question: "Can I filter recruitments by my specific department or skills?",
    answer: "Absolutely. The search engine allows you to narrow down open roles by matching them against specific skills, domains, or departmental requirements set by the project leads."
  },

  // --- Recruitments & Notifications ---
  {
    question: "Can I apply for recruitments directly through the platform?",
    answer: "Yes! Once you find an open role that matches your interests, you can apply with a single click. The recruiter will instantly receive your application along with access to your profile."
  },
  {
    question: "Will I be notified about updates to my applications?",
    answer: "Yes, IITK ProjectSpace features a real-time notification system. You will receive alerts when the status of your application changes, when you are invited to join a team, or when there are updates to projects you are involved in."
  },
  {
    question: "I am a project lead. How do I manage incoming applications?",
    answer: "As a project lead, you have access to a dedicated recruitment dashboard. From there, you can view all applicants for your open roles, review their profiles, and accept or reject applications in a streamlined workflow."
  },

  // --- Privacy & Security ---
  {
    question: "Is my data and project information visible to the public internet?",
    answer: "No. IITK ProjectSpace is an internally fenced platform. Your profile, projects, and recruitment details are strictly visible only to other authenticated IITK community members who have logged into the system."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="app-shell">
      <Suspense fallback={<div />}>
        <Header showEditProfile={false} />
      </Suspense>

      <div className="app-body">
        <Sidebar defaultActive="faq" />

        <main className="faq-main">
          <div className="faq-container pcf-card">
            <div className="pcf-card-header">
              <div>
                <h2 className="pcf-section-title">Frequently Asked Questions</h2>
                <p className="pcf-section-label">Find answers to common questions about IITK ProjectSpace.</p>
              </div>
            </div>

            <div className="faq-list">
              {faqData.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={index} className={`faq-item ${isOpen ? "faq-item--open" : ""}`}>
                    <div 
                      className="faq-question" 
                      onClick={() => handleToggle(index)}
                    >
                      {faq.question}
                      <svg className={`faq-chevron ${isOpen ? "faq-chevron--open" : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <div className="faq-answer-wrapper">
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
