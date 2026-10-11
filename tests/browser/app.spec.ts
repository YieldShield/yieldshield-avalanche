import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.avax-test.network/**',route=>route.abort());});
test('desktop market, disclosures, simulator and no-wallet feedback',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Reach higher. Know your footing.'})).toBeVisible();
 await expect(page.getByText('Contract deployment pending')).toBeVisible();
 await expect(page.getByText(/At the 7-day epoch end/)).toBeVisible();
 await page.getByRole('slider').fill('60');await expect(page.getByText('+60%',{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Connect wallet',exact:false}).first().click();
 await expect(page.getByRole('status')).toContainText('Ethereum-compatible wallet');
 await page.getByRole('button',{name:'Provide backing',exact:true}).click();
 await expect(page.getByText(/Junior entry and withdrawals freeze/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Get 10,000 free aDEMO'})).toBeDisabled();
 await page.screenshot({path:'docs/evidence/desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Asset field guide'}).click();
 await expect(page.getByRole('heading',{name:'Identity before integration.'})).toBeVisible();
 await expect(page.getByText('0x5425890298aed601595a70AB815c96711a31Bc65')).toBeVisible();
});
test('mobile navigation and layout remain usable without RPC',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Reach higher. Know your footing.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:'docs/evidence/mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Your positions'}).click();
 await expect(page.getByRole('heading',{name:'A clear view starts with your wallet.'})).toBeVisible();
 await page.getByRole('button',{name:'Asset field guide'}).click();
 await expect(page.getByRole('heading',{name:'No new token needed.'})).toBeVisible();
});
