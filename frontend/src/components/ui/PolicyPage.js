import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function PolicyPage({ title, version, effectiveDate, sections }) {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
            {version && <span>Version: {version}</span>}
            {effectiveDate && <span>Effective Date: {effectiveDate}</span>}
          </div>
          <div className="mt-4 h-1 w-16 bg-primary-600 rounded-full" />
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="prose prose-gray max-w-none">
              {section.heading && (
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {section.heading}
                </h2>
              )}
              {section.content && (
                <p className="text-gray-600 leading-relaxed text-sm">{section.content}</p>
              )}
              {section.items && (
                <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
              {section.subsections && section.subsections.map((sub, k) => (
                <div key={k} className="mt-4 ml-1">
                  {sub.heading && (
                    <h3 className="text-base font-medium text-gray-800 mb-2">{sub.heading}</h3>
                  )}
                  {sub.content && (
                    <p className="text-gray-600 text-sm leading-relaxed">{sub.content}</p>
                  )}
                  {sub.items && (
                    <ul className="mt-1 space-y-1 text-sm text-gray-600 list-disc list-inside">
                      {sub.items.map((item, l) => <li key={l}>{item}</li>)}
                    </ul>
                  )}
                </div>
              ))}
              {i < sections.length - 1 && (
                <hr className="border-gray-100 mt-6" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 p-5 bg-primary-50 rounded-xl border border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-1">Contact Us</h3>
          <p className="text-sm text-gray-600">
            HealthONTime — Website:{' '}
            <span className="text-primary-600">https://healthontime.in</span>
            {' '}&nbsp;|&nbsp; Email:{' '}
            <a href="mailto:info@healthontime.in" className="text-primary-600 hover:underline">
              info@healthontime.in
            </a>
            {' '}&nbsp;|&nbsp; Phone:{' '}
            <a href="tel:+917090002002" className="text-primary-600 hover:underline">
              +91 7090002002
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
