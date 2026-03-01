import { PollyClient, DescribeVoicesCommand } from '@aws-sdk/client-polly';

const pollyClient = new PollyClient({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

let voicesCache = null;

export const handler = async () => {
    try {
        if (!voicesCache) {
            const command = new DescribeVoicesCommand({ Engine: 'neural' });
            const response = await pollyClient.send(command);
            const allVoices = response.Voices || [];

            const grouped = {};
            for (const v of allVoices) {
                const locale = v.LanguageCode;
                if (!grouped[locale]) {
                    grouped[locale] = { locale, language: v.LanguageName || locale, voices: [] };
                }
                grouped[locale].voices.push({ id: v.Id, name: v.Name, gender: v.Gender, locale: v.LanguageCode, engine: 'neural' });
            }

            let result = Object.values(grouped).sort((a, b) => a.locale.localeCompare(b.locale));
            const enUS = result.find(l => l.locale === 'en-US');
            const trTR = result.find(l => l.locale === 'tr-TR');
            result = result.filter(l => l.locale !== 'en-US' && l.locale !== 'tr-TR');
            if (trTR) result.unshift(trTR);
            if (enUS) result.unshift(enUS);

            voicesCache = result;
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ voices: voicesCache }),
        };
    } catch (error) {
        console.error('Polly voices error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
