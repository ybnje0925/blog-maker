<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" />

  <xsl:template match="/">
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>BlogDraft Sitemap</title>
        <style>
          body {
            margin: 0;
            background: #f8fafc;
            color: #0f172a;
            font-family: Arial, "Noto Sans KR", sans-serif;
          }
          main {
            max-width: 960px;
            margin: 0 auto;
            padding: 48px 20px;
          }
          h1 {
            margin: 0;
            font-size: 32px;
            line-height: 1.2;
            letter-spacing: 0;
          }
          p {
            color: #475569;
            line-height: 1.7;
          }
          a {
            color: #1d4ed8;
            font-weight: 700;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          table {
            width: 100%;
            margin-top: 28px;
            border-collapse: collapse;
            overflow: hidden;
            border: 1px solid #dbe3ef;
            background: #fff;
          }
          th,
          td {
            padding: 14px 16px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            font-size: 14px;
          }
          th {
            background: #eff6ff;
            color: #1e3a8a;
            font-size: 12px;
            text-transform: uppercase;
          }
          tr:last-child td {
            border-bottom: 0;
          }
          .home {
            display: inline-flex;
            margin-top: 12px;
            padding: 10px 14px;
            border-radius: 8px;
            background: #1d4ed8;
            color: #fff;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>BlogDraft 사이트맵</h1>
          <p>
            검색엔진 제출용 사이트맵입니다. 첫 번째 URL은 초안 만들기 홈 화면입니다.
          </p>
          <a class="home" href="https://blog-maker-rose.vercel.app/">초안 만들기 열기</a>
          <table>
            <thead>
              <tr>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a>
                      <xsl:attribute name="href">
                        <xsl:value-of select="sitemap:loc" />
                      </xsl:attribute>
                      <xsl:value-of select="sitemap:loc" />
                    </a>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
