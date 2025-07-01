import Image from "next/image";
import { PiPhoneCall } from "react-icons/pi";
import React from "react";

const SupportIcon = () => (
  <svg
    height="100px"
    width="100px"
    version="1.1"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    viewBox="0 0 508 508"
    xmlSpace="preserve"
    className="absolute right-4 top-4"
  >
    <circle
      cx="254"
      cy="254"
      r="254"
      fill="#FFFFFF"
      stroke="#FFFF"
      strokeWidth="8"
    />
    <path
      fill="#FFD1CC"
      stroke="#FF5C39"
      strokeWidth="8"
      d="M303.7,303.3c30.5-17.3,51-50.1,51-87.6c0-55.7-45.1-100.8-100.8-100.8S153.2,160,153.2,215.6
      c0,37.6,20.6,70.3,51,87.6C141,319.3,89.7,365,66,424.8c46.5,51.1,113.5,83.2,188,83.2s141.5-32.1,188-83.2
      C418.3,365,367,319.3,303.7,303.3z"
    />
    <path
      fill="#FF5C39"
      d="M401.6,182.3h-15.8C370.9,123.4,317.5,79.6,254,79.6s-116.9,43.7-131.8,102.7h-15.8
      c-5.4,0-9.8,4.4-9.8,9.8V240c0,5.4,4.4,9.8,9.8,9.8h20c6.1,0,10.8-5.5,9.7-11.4c-2-10.4-2.7-21.3-1.8-32.5
      c4.8-59.3,53.6-106.9,113.1-110.1c69.2-3.8,126.8,51.5,126.8,119.9c0,7.8-0.8,15.3-2.2,22.7c-1.2,6,3.6,11.5,9.6,11.5h1.8
      c-4.2,13-14.9,37.2-38.3,50.2c-19.6,10.9-44.3,11.9-73.4,2.8c-1.5-6.7-8.9-14.6-16.5-18.3c-9.8-4.9-15.9-0.8-19.4,6.2
      s-3,14.3,6.7,19.2c8.6,4.3,21.6,5.2,27,0.5c13.9,4.3,26.9,6.5,39,6.5c15,0,28.5-3.3,40.4-10c27.5-15.3,38.8-43.7,42.8-57.2h9.9
      c5.4,0,9.8-4.4,9.8-9.8v-47.9C411.4,186.7,407,182.3,401.6,182.3z"
      stroke="#FFD1CC"
      strokeWidth="4"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="currentColor"
    style={{ color: "#1877f2" }}
    viewBox="0 0 24 24"
  >
    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
  </svg>
);

const InstagramIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="currentColor"
    style={{ color: "#c13584" }}
    viewBox="0 0 24 24"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="currentColor"
    style={{ color: "#0077b5" }}
    viewBox="0 0 24 24"
  >
    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="currentColor"
    style={{ color: "#ff0000" }}
    viewBox="0 0 24 24"
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
  </svg>
);

const TwitterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="currentColor"
    style={{ color: "#1da1f2" }}
    viewBox="0 0 24 24"
  >
    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
  </svg>
);

const WhatsappIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="currentColor"
    style={{ color: "#128c7e" }}
    viewBox="0 0 24 24"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export default function Footer() {
  const Logo =
    "https://res.cloudinary.com/dlie87ah0/image/upload/v1745815677/logo-edited_xjlfja.avif";
  const Logo2 =
    "https://res.cloudinary.com/dlie87ah0/image/upload/v1745815676/Klariti_Web_2_edited_n6vp0n.avif";
  const Logo3 =
    "https://res.cloudinary.com/dlie87ah0/image/upload/v1745815676/gov-login-img_optimized_edited_t1snew.avif";

  return (
    <footer className="bg-gray-100 text-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Image
            src={Logo}
            alt="Klariti Logo"
            width={103}
            height={103}
            className="object-contain"
          />
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-[339px,1fr] gap-8">
          {/* Left Card Section */}
          <div className="relative">
            <div className="bg-white p-6 rounded-lg shadow-md relative">
              <SupportIcon />
              <p className="mb-4 text-sm leading-relaxed font-bold">
                Let us call you to know more about our program
              </p>
              <button className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors duration-300 text-sm font-medium">
                Leave us a message
              </button>
              <div className="mt-4 flex items-center text-sm gap-2">
                <PiPhoneCall size={25} />
                <span className="font-bold">
                  +91 9150080180 (8 AM to 9:30 PM on all days)
                </span>
              </div>
            </div>
          </div>

          {/* Right Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Follow Us On Section */}
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wide">
                Follow Us On
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm hover:text-orange-500 transition-colors duration-300 gap-2"
                  >
                    <YoutubeIcon /> Youtube
                  </a>
                </li>
                <li>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm hover:text-orange-500 transition-colors duration-300 gap-2"
                  >
                    <TwitterIcon /> Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm hover:text-orange-500 transition-colors duration-300 gap-2"
                  >
                    <LinkedInIcon /> LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm hover:text-orange-500 transition-colors duration-300 gap-2"
                  >
                    <InstagramIcon /> Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm hover:text-orange-500 transition-colors duration-300 gap-2"
                  >
                    <FacebookIcon /> Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/919150680180"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm hover:text-orange-500 transition-colors duration-300 gap-2"
                  >
                    <WhatsappIcon /> +91 91506 80180
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wide">
                Company
              </h3>
              <ul className="space-y-3">
                {[
                  "About Us",
                  "Careers",
                  "Teacher Training Program",
                  "FAQs",
                  "Contact us",
                  "Why Klariti?",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm hover:text-orange-500 transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Others Section */}
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wide">
                Others
              </h3>
              <ul className="space-y-3">
                {[
                  "Student Policy",
                  "Child Safety",
                  "Students Blog",
                  "Book a Demo",
                  "Refunds & Cancellations",
                  "Teachers login",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm hover:text-orange-500 transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-6 border-gray-300" />

        {/* Footer Bottom Section */}
        <div className="flex flex-col md:flex-row justify-center items-center text-sm ">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 mb-2 md:mb-0 ">
            <div className="flex gap-3">
              <span>© 2025.</span>
              <span>
                <Image src={Logo2} alt="TM" width={52} height={17} />
              </span>{" "}
              <span className="relative right-3">™</span>All Rights Reserved
              <div className="space-x-4">
                <a
                  href="#"
                  className="hover:text-orange-500 transition-colors duration-300"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="hover:text-orange-500 transition-colors duration-300"
                >
                  Terms & Conditions
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Image
                src={Logo3}
                alt="govt-assigned-startup"
                width={62}
                height={20}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span>DPIIT Recognised Startup</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
