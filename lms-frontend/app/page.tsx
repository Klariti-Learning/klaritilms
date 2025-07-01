"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Users,
  TrendingUp,
  Calendar,
  Book,
  Star,
  Sparkles,
  PenTool,
} from "lucide-react";
import LoadingPage from "@/components/LoadingPage";

export default function Home() {
  const { user, loading } = useAuth();
  const [currentCourse, setCurrentCourse] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const featuredCourses = [
    {
      id: 1,
      title: "Phonics Basic",
      level: "Beginner",
      description:
        "Master the fundamentals of phonics to build a strong foundation in reading and pronunciation.",
    },
    {
      id: 2,
      title: "Phonics Advanced",
      level: "Intermediate",
      description:
        "Enhance your phonics skills with advanced techniques for fluent reading and complex word structures.",
    },
    {
      id: 3,
      title: "Creative Writing Basic",
      level: "Beginner",
      description:
        "Unleash your creativity with foundational skills in storytelling, structure, and expressive writing.",
    },
    {
      id: 4,
      title: "Creative Writing Advanced",
      level: "Intermediate",
      description:
        "Refine your writing craft with advanced narrative techniques and creative expression.",
    },
  ];

  const toggleDropdown = (courseId: number): void => {
    setIsDropdownOpen(isDropdownOpen === courseId ? null : courseId);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentCourse((prev) =>
        prev === featuredCourses.length - 1 ? 0 : prev + 1
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, featuredCourses.length]);

  if (loading) {
    return <LoadingPage message="Loading..." color="#4F46E5" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
      <div className="container mx-auto px-6 flex-grow pt-20 pb-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex flex-col md:flex-row items-center justify-between mb-16">
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-extrabold text-indigo-900 mb-4 leading-tight">
                Fun Learning for Bright Futures
              </h1>
              <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto md:mx-0">
                Klariti sparks creativity and literacy in kids aged 5-15 with
                engaging phonics and writing courses.
              </p>
              <div className="flex gap-4 justify-center md:justify-start">
                <Link
                  href="/signup"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow hover:shadow-xl transition duration-300"
                >
                  Start Learning
                </Link>
                <Link
                  href="/courses"
                  className="inline-block px-6 py-3 bg-teal-500 text-white font-semibold rounded-xl shadow hover:bg-teal-600 transition duration-300"
                >
                  Explore Courses
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0">
              <div className="w-full h-[300px] md:h-[400px] bg-white/60 border-2 border-yellow-200 rounded-2xl shadow-lg flex items-center justify-center text-indigo-700 text-lg font-medium">
                Hero image placeholder
              </div>
            </div>
          </div>

          {/* Welcome Section */}
          <motion.h1
            className="text-3xl md:text-5xl font-extrabold mb-12 bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Welcome to Klariti, {user?.name || "Young Learner"}!
          </motion.h1>

          {/* Stats Section */}
          {user && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <StatCard
                icon={<TrendingUp className="w-10 h-10 text-yellow-500" />}
                title="Courses Completed"
                value="3"
                bgColor="bg-yellow-50"
              />
              <StatCard
                icon={<Calendar className="w-10 h-10 text-teal-500" />}
                title="Active Courses"
                value="2"
                bgColor="bg-teal-50"
              />
              <StatCard
                icon={<Book className="w-10 h-10 text-orange-500" />}
                title="Learning Hours"
                value="45"
                bgColor="bg-orange-50"
              />
            </motion.div>
          )}

          {/* Featured Courses Section */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <h3 className="text-3xl font-bold text-purple-600 mb-8 flex items-center gap-3 text-center">
              <Sparkles className="w-8 h-8 text-yellow-500" /> Explore Our Fun
              Courses
            </h3>
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCourse}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="bg-teal-50/90 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-teal-100"
                >
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-full md:w-1/3 h-[200px] bg-white/60 border border-yellow-200 rounded-xl flex items-center justify-center text-indigo-700 text-lg font-medium">
                      Course placeholder
                    </div>
                    <div className="md:w-2/3">
                      <h4 className="text-2xl font-semibold text-indigo-900">
                        {featuredCourses[currentCourse].title}
                      </h4>
                      <p className="text-gray-600 mt-2">
                        Level: {featuredCourses[currentCourse].level}
                      </p>
                      <p className="text-gray-600 mt-4">
                        {featuredCourses[currentCourse].description}
                      </p>
                      <button
                        onClick={() =>
                          toggleDropdown(featuredCourses[currentCourse].id)
                        }
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
                      >
                        Learn More
                      </button>
                      <AnimatePresence>
                        {isDropdownOpen ===
                          featuredCourses[currentCourse].id && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 bg-white/90 backdrop-blur-md border border-teal-100 rounded-lg shadow-lg p-4"
                          >
                            <p className="text-gray-600 text-sm">
                              {featuredCourses[currentCourse].description}{" "}
                              Enroll now to start your learning adventure!
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="flex justify-center mt-6 gap-3">
                {featuredCourses.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCourse(index)}
                    className={`w-4 h-4 rounded-full transition-colors duration-300 ${
                      currentCourse === index ? "bg-yellow-500" : "bg-gray-300"
                    }`}
                    aria-label={`Go to course ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Info Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <InfoCard
              icon={<BookOpen className="w-10 h-10 text-yellow-500" />}
              title="Explore Courses"
              description="Fun and interactive courses designed to make learning exciting for kids."
              linkHref="/courses"
              linkText="Discover Now"
              bgColor="bg-yellow-50"
              buttonColor="bg-teal-500 hover:bg-teal-600"
            />
            <InfoCard
              icon={<GraduationCap className="w-10 h-10 text-teal-500" />}
              title="Track Progress"
              description="Watch your child's skills grow with personalized progress tracking."
              linkHref={user ? "/my-learnings" : "/login"}
              linkText={user ? "View Progress" : "Log in to start"}
              bgColor="bg-teal-50"
              buttonColor="bg-orange-500 hover:bg-orange-600"
            />
            <InfoCard
              icon={<Users className="w-10 h-10 text-orange-500" />}
              title="Join the Community"
              description="Connect with other young learners and share creative ideas."
              linkHref="/community"
              linkText="Join the Fun"
              bgColor="bg-orange-50"
              buttonColor="bg-pink-500 hover:bg-pink-600"
            />
          </div>

          {/* Why Choose Us Section */}
          <motion.div
            className="bg-gradient-to-r from-yellow-50 to-teal-50 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-yellow-100 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <h3 className="text-3xl font-bold text-indigo-900 mb-8 text-center">
              Why Choose Klariti?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Star className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-indigo-900">
                  Engaging Content
                </h4>
                <p className="text-gray-600">
                  Interactive lessons that kids love, making learning a joy.
                </p>
              </div>
              <div className="text-center">
                <PenTool className="w-10 h-10 text-teal-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-indigo-900">
                  Creative Focus
                </h4>
                <p className="text-gray-600">
                  Courses designed to spark imagination and build skills.
                </p>
              </div>
              <div className="text-center">
                <Users className="w-10 h-10 text-orange-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-indigo-900">
                  Safe Community
                </h4>
                <p className="text-gray-600">
                  A supportive space for kids to learn and grow together.
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            className="text-center bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h3 className="text-3xl font-bold mb-4">
              Ready to Start the Adventure?
            </h3>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              Join Klariti today and give your child the gift of fun, creative
              learning!
            </p>
            <Link
              href="/signup"
              className="inline-block px-8 py-3 bg-teal-500 text-white font-semibold rounded-xl shadow hover:bg-teal-600 transition duration-300"
            >
              Sign Up Now
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

const StatCard = ({
  icon,
  title,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  bgColor: string;
}) => (
  <div
    className={`${bgColor} backdrop-blur-md p-6 rounded-xl shadow-md flex items-center gap-4 border border-gray-100`}
  >
    {icon}
    <div>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-indigo-900">{value}</p>
    </div>
  </div>
);

const InfoCard = ({
  icon,
  title,
  description,
  linkHref,
  linkText,
  bgColor,
  buttonColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkHref: string;
  linkText: string;
  bgColor: string;
  buttonColor: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card
      className={`h-full ${bgColor} backdrop-blur-md border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[300px]`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4 cursor-pointer">
          <div className="p-3 bg-white/50 rounded-lg">{icon}</div>
          <CardTitle className="text-xl font-bold text-indigo-900">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-between h-[calc(100%-80px)]">
        <p className="text-gray-600 text-base mb-6">{description}</p>
        <Link
          href={linkHref}
          className={`inline-flex items-center gap-2 px-4 py-2 ${buttonColor} text-white font-semibold rounded-xl transition-colors`}
        >
          {linkText} <motion.span whileHover={{ x: 5 }}>→</motion.span>
        </Link>
      </CardContent>
    </Card>
  </motion.div>
);
