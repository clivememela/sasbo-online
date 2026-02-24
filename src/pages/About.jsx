import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Printer,
  Youtube
} from 'lucide-react';
import { useTheme } from '../context/useTheme';

export default function About() {
  const { darkMode } = useTheme();
  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">About Us</h2>

      <div className="space-y-6 max-w-4xl mx-auto">
        <section className="space-y-3">
          <h3 className="text-xl text-cyan-800 dark:text-cyan-300">Who We Are</h3>
          <p className="text-gray-600 dark:text-gray-400">
          Sasbo, the South African Society of Bank Officials as it was in 1916,
          started with members from the National Bank of South Africa Limited,
          the African Banking Corporation, the Netherlands Bank of South African
          Limited and the Standard Bank of South Africa Limited. Over time the
          union became a niche union operating almost exclusively in the
          Standard Bank of South Africa Limited and the then Barclays National
          Bank of South Africa Limited. Sasbo - The Finance Union, as it is now
          known, having diversified into the finance sector as a whole, has de
          facto recognition with approximately 20 financial institutions,
          ranging from banks to insurance companies to pension fund
          administrators and the like, and has members from nearly 200
          financial institutions throughout the country. The union still has a
          banking flavor though in that the bulk of the membership is from ABSA,
          First National Bank and the Standard Bank, with Nedbank running a close
          fourth.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl text-cyan-800 dark:text-cyan-300">Our Core Values</h3>
          <p className="text-gray-600 dark:text-gray-400">
          The Foundation of South Africa's Premier Finance Union
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
            <li>
              <span className="text-gray-900 dark:text-gray-100">
                Passion:
              </span>{' '}
              We are passionate about everything we do. Our passion is driven by
              our desire to make a positive difference to the lives of our
              members. Our enthusiasm is infectious.
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100">
                Risk Tolerance:
              </span>{' '}
              We believe in taking prudent, calculated risks. We are always
              ready to challenge the status quo and engage in constructive
              confrontation.
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100">
                Excellence:
              </span>{' '}
              We strive to excel in every aspect of our business. We aim to
              deliver service excellence to each and every member.
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100">
                Motivation:
              </span>{' '}
              We celebrate our success. We are all committed to hard work and
              performance. We celebrate our successes and recognise those who
              outperform.
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100">
                Innovation:
              </span>{' '}
              We are continuously moving forward, innovating and improving. We
              are open to ideas that challenge conventional views and drive
              innovation.
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100">
                Empowerment:
              </span>{' '}
              We believe in empowering our employees. We encourage our employees
              to share their knowledge and give respect and responsibility to
              those around them.
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100">
                Respect:
              </span>{' '}
              We treat others as we would like to be treated ourselves. We value
              our differences and respect the ideas and opinions of others.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl text-shadow-cyan-300 dark:text-cyan-300">Financial Institutions</h3>
          <p className="text-gray-600 dark:text-gray-400">
          Sasbo extends a hearty welcome to all members in all Financial
          Institutions. We currently have Recognition Agreements with the
          following Finance Institutions:
          </p>
          <ul className="list-disc pl-6 grid gap-1 sm:grid-cols-2 text-gray-600 dark:text-gray-400">
            <li>Absa Bank</li>
            <li>African Bank</li>
            <li>Bank of Athens</li>
            <li>Bankserv</li>
            <li>First National Bank</li>
            <li>IPS</li>
            <li>LandBank</li>
            <li>NHFC</li>
            <li>Nedbank</li>
            <li>Old Mutual</li>
            <li>SA Reserve Bank</li>
            <li>Santam</li>
            <li>SBV</li>
            <li>Standard Bank</li>
            <li>UBank</li>
            <li>VBS</li>
            <li>Capitec Bank</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className={`text-xl ${darkMode ? "text-cyan-300" : "text-shadow-cyan-300"}`}>Partners & Affiliates</h3>
          <h3 className="text-xl text-shadow-cyan-300 dark:text-cyan-300">Head Office</h3>
          <div className="space-y-3 text-gray-600 dark:text-gray-400">
            <div className="flex gap-3">
              <MapPin className="mt-1 h-5 w-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
              <div>
                <p>Fourmall Office Park West</p>
                <p>1 Percy Street</p>
                <p>Fourways, 2191</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="mt-1 h-5 w-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
              <p>
                Email:{' '}
                <a
                  href="mailto:reception@sasbo.org.za"
                  className="text-cyan-600 hover:underline dark:text-cyan-400"
                >
                  reception@sasbo.org.za
                </a>
              </p>
            </div>
            <div className="flex gap-3">
              <Phone className="mt-1 h-5 w-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
              <p>
                Phone:{' '}
                <a
                  href="tel:+27114670192"
                  className="text-cyan-600 hover:underline dark:text-cyan-400"
                >
                  +27 11 467 0192
                </a>
              </p>
            </div>
            <div className="flex gap-3">
              <Printer className="mt-1 h-5 w-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
              <p>
                Fax:{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  +27 11 467 0188
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="https://www.instagram.com/sasbo_the_finance_union/"
                className="inline-flex items-center gap-2 text-cyan-600 hover:underline dark:text-cyan-400"
              >
                <Instagram className="h-4 w-4" strokeWidth={1.5} />
                Instagram
              </a>
              <a
                href="https://www.linkedin.com/company/sasbo/"
                className="inline-flex items-center gap-2 text-cyan-600 hover:underline dark:text-cyan-400"
              >
                <Linkedin className="h-4 w-4" strokeWidth={1.5} />
                LinkedIn
              </a>
              <a
                href="https://www.youtube.com/channel/UCm2xVnyrAr8zXTeEOX17l3A"
                className="inline-flex items-center gap-2 text-cyan-600 hover:underline dark:text-cyan-400"
              >
                <Youtube className="h-4 w-4" strokeWidth={1.5} />
                YouTube
              </a>
              <a
                href="https://www.facebook.com/SasboTheFinanceUnion"
                className="inline-flex items-center gap-2 text-cyan-600 hover:underline dark:text-cyan-400"
              >
                <Facebook className="h-4 w-4" strokeWidth={1.5} />
                Facebook
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
