"""Real-browser checks. The node/jsdom suites stub requestAnimationFrame, so they
cannot see anything that goes wrong inside the frame loop — which is exactly
where the 60-pings-a-second bug lived. This runs the actual packaged build."""
from playwright.sync_api import sync_playwright

BUILD = "file:///home/claude/opus-realms/index.html"
passed = failed = 0
def ok(name, cond, detail=""):
    global passed, failed
    passed, failed = (passed+1, failed) if cond else (passed, failed+1)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  {detail}" if detail else ""))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1100, "height": 700})

    # count every request the page makes to the counter
    reqs = []
    pg.on("request", lambda r: reqs.append(r.url) if "workers.dev" in r.url else None)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))

    pg.goto(BUILD)
    pg.wait_for_timeout(3000)

    print("\n=== the naming prompt ===")
    inp = pg.query_selector("#nameprompt")
    ok("prompt appears for a nameless character", bool(inp))
    ok("prompt is visible", inp.is_visible() if inp else False)

    # count rebuilds over two seconds
    pg.evaluate("""() => { window.__n = 0;
        const f = UI.promptForName.bind(UI);
        UI.promptForName = (...a) => { window.__n++; return f(...a); }; }""")
    pg.wait_for_timeout(2000)
    ok("prompt is not rebuilt every frame", pg.evaluate("window.__n") == 0,
       f"{pg.evaluate('window.__n')} rebuilds in 2s")

    # the actual complaint: can a person type?
    pg.click("#nameprompt")
    pg.keyboard.type("Bennix")
    val = pg.input_value("#nameprompt")
    ok("typing works", val == "Bennix", repr(val))

    pg.click("text=That is my name")
    pg.wait_for_timeout(300)
    ok("submitting closes the prompt", pg.query_selector("#nameprompt") is None)
    ok("name is saved", pg.evaluate("S.name") == "Bennix", pg.evaluate("S.name"))

    print("\n=== request rate ===")
    before = len(reqs)
    pg.wait_for_timeout(4000)
    after = len(reqs)
    ok("no flood of requests", after - before <= 1, f"{after - before} requests in 4s (a 5 minute ping means 0)")
    ok("total requests since load is tiny", after <= 3, f"{after} total")

    print("\n=== no errors on the page ===")
    ok("no uncaught errors", not errs, "; ".join(errs[:3]))

    b.close()

print(f"\n{'ALL PASSED' if not failed else str(failed) + ' FAILURES'}")
raise SystemExit(1 if failed else 0)
