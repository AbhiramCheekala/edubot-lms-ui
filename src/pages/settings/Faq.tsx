import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const faqQuestions = [
  "What is the purpose of this platform?",
  "Who can use this platform?",
  "How do I sign up for the platform?",
  "Are there any fees to use this platform?",
  "What types of courses are available?",
  "How are the courses structured?",
  "How do I use the AI tools?",
  "What should I do if I encounter a technical issue?",
  "How do I report a bug or give feedback?",
  "How is my personal information protected?",
  "Can I delete my account?",
  "Is there a mobile app for the platform?",
];

const FaqPage = () => {
  return (
    <div>
      <Card className="md:tw-w-[772px] tw-w-auto tw-h-auto md:tw-h-auto tw-rounded-sm tw-bg-white tw-shadow-[0_0_8px_0_rgba(0,0,0,0.15)]">
        <CardContent>
          <div className="tw-py-6">
            <p className="tw-font-[600] tw-text-sm">FAQ</p>
          </div>
          <div className="md:tw-w-[376px] tw-w-auto tw-h-auto md:tw-h-[360px] tw--translate-y-2 ">
            {faqQuestions.map((question, index) => (
              <p
                key={index}
                className="!tw-text-[#1D1F71] tw-text-xs tw-font-[400] tw-leading-4 tw-mb-4"
              >
                {index + 1}. {question}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaqPage;
