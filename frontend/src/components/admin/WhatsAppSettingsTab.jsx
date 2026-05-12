import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Send } from 'lucide-react';

const WhatsAppSettingsTab = ({ 
  whatsappSettings,
  whatsappLoading,
  testNumber,
  setTestNumber,
  testLoading,
  onSettingChange,
  onEventSettingChange,
  onSaveSettings,
  onTestMessage
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">WhatsApp Integration</h2>
        <Button 
          onClick={onSaveSettings} 
          disabled={whatsappLoading}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="save-whatsapp-btn"
        >
          {whatsappLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Master Switch */}
      <Card className="border-slate-200 shadow-soft" data-testid="whatsapp-settings-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-green-600" />
              <div>
                <CardTitle className="text-lg">Master Switch</CardTitle>
                <p className="text-sm text-slate-500">Enable or disable all WhatsApp notifications globally</p>
              </div>
            </div>
            <Switch
              checked={whatsappSettings.enabled}
              onCheckedChange={(checked) => onSettingChange('enabled', checked)}
              disabled={whatsappLoading}
              data-testid="whatsapp-master-switch"
            />
          </div>
        </CardHeader>
      </Card>

      {whatsappSettings.enabled && (
        <>
          {/* MSG91 Configuration */}
          <Card className="border-slate-200 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">MSG91 Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Integrated WhatsApp Number</Label>
                <Input
                  value={whatsappSettings.integrated_number || ''}
                  onChange={(e) => onSettingChange('integrated_number', e.target.value)}
                  placeholder="918728054145"
                  data-testid="whatsapp-number-input"
                />
                <p className="text-xs text-slate-500">Your MSG91 registered WhatsApp number</p>
              </div>
            </CardContent>
          </Card>

          {/* Event Templates */}
          <Card className="border-slate-200 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Event Templates</CardTitle>
              <p className="text-sm text-slate-500">Configure separate MSG91 templates for each notification event</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(whatsappSettings.events || {}).map(([eventKey, eventConfig]) => (
                <div key={eventKey} className="border border-slate-200 rounded-lg p-4" data-testid={`event-${eventKey}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm capitalize">
                        {eventKey.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-slate-500">{eventConfig.description}</p>
                    </div>
                    <Switch
                      checked={eventConfig.enabled}
                      onCheckedChange={(checked) => onEventSettingChange(eventKey, 'enabled', checked)}
                      disabled={whatsappLoading}
                    />
                  </div>
                  
                  {eventConfig.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Template Name</Label>
                        <Input
                          value={eventConfig.template_name || ''}
                          onChange={(e) => onEventSettingChange(eventKey, 'template_name', e.target.value)}
                          placeholder="your_template_name"
                          className="h-8 text-sm"
                          disabled={whatsappLoading}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Namespace</Label>
                        <Input
                          value={eventConfig.namespace || ''}
                          onChange={(e) => onEventSettingChange(eventKey, 'namespace', e.target.value)}
                          placeholder="73fda5e9_77e9_445f_..."
                          className="h-8 text-sm"
                          disabled={whatsappLoading}
                        />
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium">Variables:</span>{' '}
                          {eventConfig.variables?.map((v) => (
                            <code key={v} className="bg-slate-100 px-1 mx-0.5 rounded text-xs">
                              {`{${v}}`}
                            </code>
                          ))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Test Message */}
          <Card className="border-slate-200 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Test Integration</CardTitle>
              <p className="text-sm text-slate-500">Send a test message to verify your configuration</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="Enter phone number (e.g., 919876543210)"
                  className="flex-1"
                  data-testid="test-number-input"
                />
                <Button
                  onClick={onTestMessage}
                  disabled={testLoading || !testNumber}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="send-test-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {testLoading ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WhatsAppSettingsTab;
