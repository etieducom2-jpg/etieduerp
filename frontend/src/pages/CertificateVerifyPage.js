import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Award, User, BookOpen, Building, Calendar, Loader2 } from 'lucide-react';
import { certificateAPI } from '@/api/api';

const CertificateVerifyPage = () => {
  const { verificationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await certificateAPI.verify(verificationId);
        setResult(response.data);
      } catch (error) {
        setResult({
          verified: false,
          message: 'Failed to verify certificate. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    };

    if (verificationId) {
      verify();
    }
  }, [verificationId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://etieducom.com/wp-content/uploads/2024/03/eti-educom-logo.png" 
            alt="ETI Educom" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Certificate Verification</h1>
          <p className="text-slate-400">ETI Educom - Verify Certificate Authenticity</p>
        </div>

        <Card className="bg-white/95 backdrop-blur shadow-2xl">
          <CardContent className="pt-8 pb-8">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600">Verifying certificate...</p>
              </div>
            ) : result?.verified ? (
              <div className="space-y-6">
                {/* Success Header */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Certificate Verified!</h2>
                  <Badge className="bg-green-100 text-green-700">Authentic Certificate</Badge>
                </div>

                {/* Certificate Details */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <Award className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Certificate ID</p>
                      <p className="font-mono font-bold">{result.certificate_details.certificate_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Student Name</p>
                      <p className="font-semibold">{result.certificate_details.student_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Program</p>
                      <p className="font-semibold">{result.certificate_details.program_name}</p>
                      <p className="text-sm text-slate-500">Duration: {result.certificate_details.program_duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <Building className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Branch</p>
                      <p className="font-semibold">{result.certificate_details.branch_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Training Mode</p>
                      <p className="font-semibold">{result.certificate_details.training_mode}</p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm text-slate-500">
                  Registration: {result.certificate_details.registration_number}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h2>
                <Badge className="bg-red-100 text-red-700 mb-4">Invalid or Not Found</Badge>
                <p className="text-slate-600">{result?.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          &copy; {new Date().getFullYear()} ETI Educom. All rights reserved.
          <br />
          <span className="text-xs">ISO 9001:2015 Certified</span>
        </p>
      </div>
    </div>
  );
};

export default CertificateVerifyPage;
