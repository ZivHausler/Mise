import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';
import { Button } from '@/components/Button';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="text-center">
        <p className="font-mono text-display text-primary-300">404</p>
        <h1 className="mt-4 font-heading text-h1 text-neutral-800">
          {t('errors.notFound', 'Page not found')}
        </h1>
        <p className="mt-2 text-body text-neutral-500">
          {t('errors.notFoundDesc', "The page you're looking for doesn't exist.")}
        </p>
        <div className="mt-8">
          <Button variant="primary" icon={<Home className="h-4 w-4" />} onClick={() => navigate('/')}>
            {t('errors.goHome', 'Back to Dashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
}
