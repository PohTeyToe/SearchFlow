import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'searchflow-tour-completed';

export const GuidedTour: React.FC = () => {
    useEffect(() => {
        if (localStorage.getItem(TOUR_KEY)) return;

        // Small delay to let the page render
        const timeout = setTimeout(() => {
            const driverObj = driver({
                showProgress: true,
                animate: true,
                overlayColor: 'rgba(0,0,0,0.6)',
                popoverClass: 'searchflow-tour',
                steps: [
                    {
                        element: '#booking-funnel',
                        popover: {
                            title: 'Booking Funnel',
                            description: 'Track your search-to-booking funnel in real-time. See where travelers drop off and identify revenue opportunities.',
                            side: 'bottom',
                            align: 'center',
                        },
                    },
                    {
                        element: '#nav-users',
                        popover: {
                            title: 'User Churn Analysis',
                            description: 'See which users are at risk of churning and why — powered by XGBoost + SHAP explainability.',
                            side: 'right',
                            align: 'center',
                        },
                    },
                    {
                        element: '#chat-button',
                        popover: {
                            title: 'AI Search Assistant',
                            description: 'Ask the LangChain-powered assistant questions about your data. Try: "Why is user_1008 at risk?"',
                            side: 'left',
                            align: 'center',
                        },
                    },
                    {
                        element: '#pipelines-section',
                        popover: {
                            title: 'Pipeline Monitoring',
                            description: 'Monitor your Airflow DAGs, dbt transforms, and ML training runs all in one place.',
                            side: 'top',
                            align: 'center',
                        },
                    },
                ],
                onDestroyed: () => {
                    localStorage.setItem(TOUR_KEY, 'true');
                },
            });

            driverObj.drive();
        }, 800);

        return () => clearTimeout(timeout);
    }, []);

    return null;
};
