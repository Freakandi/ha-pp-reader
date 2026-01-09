
import { describe, it } from "node:test";
import assert from "node:assert";
import { installDomEnvironment } from "../../__tests__/dom";

describe("updatePortfolioFooterFromDom", () => {
  it("should only update the direct footer of the specified table and not touch nested footers", async () => {
    const env = installDomEnvironment();
    const { document } = env;

    // Dynamically import the module *after* the DOM environment is installed
    const { updatePortfolioFooterFromDom } = await import("../overview");

    try {
      document.body.innerHTML = `
        <div class="portfolio-table">
          <table class="expandable-portfolio-table">
            <tbody>
              <tr class="portfolio-row"
                  data-position-count="10"
                  data-current-value="1000"
                  data-purchase-sum="800"
                  data-day-change="50"
                  data-gain-abs="200"
                  data-has-value="true">
                <td>Portfolio 1</td>
                <td>10</td>
                <td>Value</td>
                <td>Day</td>
                <td>Gain</td>
              </tr>
              <tr class="portfolio-details">
                <td colspan="5">
                  <div class="positions-container">
                    <table>
                      <tbody>
                        <tr><td>Position 1</td></tr>
                        <tr class="footer-row">
                          <td class="inner-footer-cell">Inner Footer Content</td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
              <tr class="portfolio-row"
                  data-position-count="5"
                  data-current-value="1500"
                  data-purchase-sum="1200"
                  data-day-change="-25"
                  data-gain-abs="300"
                  data-has-value="true">
                <td>Portfolio 2</td>
                <td>5</td>
                <td>Value</td>
                <td>Day</td>
                <td>Gain</td>
              </tr>
              <tr class="footer-row">
                <td class="outer-footer-cell">Initial Outer Footer</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      const outerTable = document.querySelector(".expandable-portfolio-table");
      assert(outerTable, "Outer table should be found");

      // --- Act ---
      updatePortfolioFooterFromDom(outerTable);

      // --- Assert ---
      const allFooters = document.querySelectorAll(".footer-row");
      assert.strictEqual(allFooters.length, 2, "Both footer rows should still exist after the update");

      const innerFooterCell = document.querySelector(".inner-footer-cell");
      assert(innerFooterCell, "Inner footer cell should still exist");
      assert.strictEqual(
        innerFooterCell.textContent,
        "Inner Footer Content",
        "Inner footer content should NOT be changed"
      );

      const outerTbody = outerTable.querySelector("tbody");
      assert(outerTbody, "Outer tbody should be found");
      const outerFooter = Array.from(outerTbody.children).find(el => el.classList.contains('footer-row'));

      assert(outerFooter, "Outer footer should be found as a direct child of tbody");

      const outerFooterCell1 = outerFooter.querySelector("td:nth-child(1)");
      assert.strictEqual(outerFooterCell1?.textContent?.trim(), "Summe", "Outer footer should be updated with 'Summe'");

      const outerFooterCell2 = outerFooter.querySelector("td:nth-child(2)");
      assert.strictEqual(outerFooterCell2?.textContent?.trim(), "15", "Position count should be summed correctly");

      const outerFooterCell5 = outerFooter.querySelector("td:nth-child(5)");
      assert(outerFooterCell5, "5th cell of outer footer should exist");
      const gainAbsSpan = outerFooterCell5.querySelector(".val-top");
      assert(gainAbsSpan, "Gain Abs span should exist in the footer");
      assert(gainAbsSpan.textContent?.includes("500"), "Absolute gain should be summed correctly (200 + 300 = 500)");

    } finally {
      env.restore();
    }
  });
});
