export default function OnetAttribution() {
  return (
    <div className="text-center space-y-2 py-4">
      <a
        href="https://services.onetcenter.org/"
        title="This site incorporates information from O*NET Web Services. Click to learn more."
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="https://www.onetcenter.org/image/link/onet-in-it.svg"
          alt="O*NET in-it"
          className="mx-auto"
          style={{ width: 130, height: 60 }}
        />
      </a>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        This site incorporates information from{' '}
        <a href="https://services.onetcenter.org/" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
          O*NET Web Services
        </a>{' '}
        by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET® is a trademark of USDOL/ETA.
      </p>
    </div>
  );
}
