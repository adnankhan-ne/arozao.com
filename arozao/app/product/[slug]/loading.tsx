export default function ProductDetailLoading() {
  return (
    <main className="pdp-route-loading" aria-busy="true" aria-label="Loading product details">
      <div className="pdp-route-loading-breadcrumb" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="pdp-route-loading-grid" aria-hidden="true">
        <div className="pdp-route-loading-gallery">
          <div className="pdp-route-loading-image" />
          <div className="pdp-route-loading-thumbnails">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="pdp-route-loading-details">
          <span className="pdp-route-loading-line pdp-route-loading-short" />
          <span className="pdp-route-loading-line pdp-route-loading-title" />
          <span className="pdp-route-loading-line" />
          <span className="pdp-route-loading-line pdp-route-loading-medium" />
          <span className="pdp-route-loading-price" />
          <span className="pdp-route-loading-line" />
          <span className="pdp-route-loading-line pdp-route-loading-medium" />
        </div>
        <div className="pdp-route-loading-buybox">
          <span className="pdp-route-loading-price" />
          <span className="pdp-route-loading-line" />
          <span className="pdp-route-loading-button" />
          <span className="pdp-route-loading-button" />
        </div>
      </div>
    </main>
  );
}
