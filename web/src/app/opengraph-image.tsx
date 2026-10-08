import { ImageResponse } from "next/og";

export const alt = "NOW - Shop your favorite stores";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(ellipse at 15% 90%, rgba(244,185,66,.24), transparent 36%), radial-gradient(ellipse at 90% 10%, rgba(33,134,110,.72), transparent 42%), linear-gradient(125deg, #18332d, #105647 62%, #126b57)",
          color: "#ffffff",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "80px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              color: "#f4b942",
              direction: "rtl",
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            YOUR FAVORITE STORES
          </div>
          <div
            style={{
              direction: "rtl",
              display: "flex",
              fontSize: 60,
              fontWeight: 800,
            }}
          >
            Shop online with NOW
          </div>
          <div
            style={{
              color: "rgba(255,255,255,.75)",
              direction: "rtl",
              display: "flex",
              fontSize: 30,
            }}
          >
            Fresh picks, delivered to you
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            background: "#f8f7f2",
            borderRadius: 64,
            color: "#126b57",
            display: "flex",
            fontSize: 86,
            fontWeight: 900,
            height: 230,
            justifyContent: "center",
            letterSpacing: -8,
            width: 300,
          }}
        >
          NOW
        </div>
      </div>
    ),
    size,
  );
}
