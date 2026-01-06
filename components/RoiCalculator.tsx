"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Language, getTranslation } from "@/lib/translations";
import { cn } from "@/lib/utils";

type Currency = "EUR" | "USD" | "GBP";

// Currency conversion rates (EUR base)
const CURRENCY_RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 0.86, // 1 EUR = 0.86 USD
  GBP: 0.87, // 1 EUR = 0.87 GBP
};

// Machine prices in euros (using internal keys)
const MACHINE_PRICES: Record<string, number> = {
  hpi300: 60000,
  hpi350: 110000,
  hpi650: 210000,
};

interface CalculationResults {
  outputOld: number;
  outputNew: number;
  outputDiff: number;
  profitPerYear: number;
  profitPerMonth: number;
  paybackTime: number;
}

const formatCurrencyIntl = (value: number, currency: Currency) => {
  const locale = currency === "USD" ? "en-US" : currency === "GBP" ? "en-GB" : "de-DE";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumberIntl = (value: number) =>
  new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getMachineSuggestion = (monthlyProduction: number) => {
  if (monthlyProduction <= 7000) return "hpi300";
  if (monthlyProduction <= 14000) return "hpi350";
  return "hpi650";
};

export function RoiCalculator() {
  const [language, setLanguage] = React.useState<Language>("de");
  const [currency, setCurrency] = React.useState<Currency>("EUR");
  const t = getTranslation(language);

  // Wizard state - 5 steps (no contact step, using modal instead)
  const totalSteps = 5;
  const [currentStep, setCurrentStep] = React.useState<number>(1);

  // Data states - all empty initially to force selection
  const [productTypeKey, setProductTypeKey] = React.useState<string>("");
  const [productStateKey, setProductStateKey] = React.useState<string>("");
  const [monthlyProduction, setMonthlyProduction] = React.useState<string>("");
  const [materialPrice, setMaterialPrice] = React.useState<string>("");
  const [currentYield, setCurrentYield] = React.useState<string>("");
  const [targetYield, setTargetYield] = React.useState<string>("");
  
  // Contact modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [emailError, setEmailError] = React.useState("");

  // Machine suggestion is derived later
  const machineSuggestion = React.useMemo(() => {
    const monthlyVal = parseFloat(monthlyProduction);
    if (isNaN(monthlyVal) || monthlyVal <= 0) return "hpi300";
    return getMachineSuggestion(monthlyVal);
  }, [monthlyProduction]);

  // Derived labels
  const productType =
    productTypeKey === "fish"
      ? t.fish
      : productTypeKey === "pork"
      ? t.pork
      : productTypeKey === "beef"
      ? t.beef
      : productTypeKey === "poultry"
      ? t.poultry
      : productTypeKey === "vegan"
      ? t.vegan
      : "";

  const productState = productStateKey === "fresh" ? t.fresh : productStateKey === "frozen" ? t.frozen : "";

  const suggestedMachineLabel =
    machineSuggestion === "hpi300"
      ? t.hpi300
      : machineSuggestion === "hpi350"
      ? t.hpi350
      : t.hpi650;

  // Convert EUR to selected currency
  const convertCurrency = (valueInEUR: number): number => {
    return valueInEUR * CURRENCY_RATES[currency];
  };

  // Calculations
  const calculateResults = React.useMemo((): CalculationResults | null => {
    const monthlyVal = parseFloat(monthlyProduction);
    const price = parseFloat(materialPrice);
    const yieldOld = parseFloat(currentYield);
    const yieldNew = parseFloat(targetYield);
    const costEUR = MACHINE_PRICES[machineSuggestion];

    if (
      isNaN(monthlyVal) ||
      isNaN(price) ||
      isNaN(yieldOld) ||
      isNaN(yieldNew) ||
      !costEUR ||
      monthlyVal <= 0 ||
      price <= 0 ||
      yieldOld < 0 ||
      yieldNew < 0 ||
      yieldNew <= yieldOld
    ) {
      return null;
    }

    const outputOld = monthlyVal * (1 + yieldOld / 100);
    const outputNew = monthlyVal * (1 + yieldNew / 100);
    const outputDiff = outputNew - outputOld;
    const profitPerYearEUR = outputDiff * price * 12;
    const profitPerMonthEUR = profitPerYearEUR / 12;
    
    // Convert to selected currency
    const profitPerYear = convertCurrency(profitPerYearEUR);
    const profitPerMonth = convertCurrency(profitPerMonthEUR);
    const cost = convertCurrency(costEUR);
    
    const paybackTime = cost / profitPerYear;

    return {
      outputOld,
      outputNew,
      outputDiff,
      profitPerYear,
      profitPerMonth,
      paybackTime,
    };
  }, [monthlyProduction, materialPrice, currentYield, targetYield, machineSuggestion, currency]);

  const formatPaybackTime = (years: number): string => {
    if (years < 0.08) {
      return t.lessThanOneMonth;
    }
    return `${years.toFixed(1).replace(".", ",")} ${t.years}`;
  };

  const formatCurrency = (value: number): string => formatCurrencyIntl(value, currency);
  const formatNumber = (value: number): string => formatNumberIntl(value);

  // Validation functions
  const validateName = (value: string): boolean => {
    if (/\d/.test(value)) {
      setNameError(language === "de" ? "Name darf keine Zahlen enthalten" : language === "en" ? "Name cannot contain numbers" : "El nombre no puede contener números");
      return false;
    }
    if (value.trim().length < 2) {
      setNameError(language === "de" ? "Name muss mindestens 2 Zeichen lang sein" : language === "en" ? "Name must be at least 2 characters" : "El nombre debe tener al menos 2 caracteres");
      return false;
    }
    setNameError("");
    return true;
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError(language === "de" ? "Bitte geben Sie eine gültige E-Mail-Adresse ein" : language === "en" ? "Please enter a valid email address" : "Por favor ingrese una dirección de correo electrónico válida");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Validation per step - all fields must be filled
  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return !!currency;
      case 2:
        return !!productTypeKey && !!productStateKey;
      case 3:
        const monthlyVal = parseFloat(monthlyProduction);
        const priceVal = parseFloat(materialPrice);
        return !!monthlyProduction && !!materialPrice && !isNaN(monthlyVal) && !isNaN(priceVal) && monthlyVal > 0 && priceVal > 0;
      case 4:
        const yieldOld = parseFloat(currentYield);
        const yieldNew = parseFloat(targetYield);
        return (
          !!currentYield &&
          !!targetYield &&
          !isNaN(yieldOld) &&
          !isNaN(yieldNew) &&
          yieldOld >= 0 &&
          yieldNew > yieldOld
        );
      case 5:
        return calculateResults !== null;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      if (currentStep === 4) {
        // Step 4 -> Step 5 (Results), open modal for contact
        setIsModalOpen(true);
      }
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  // Chart data for Output comparison (Alt vs Neu)
  const chartData = React.useMemo(() => {
    if (!calculateResults) return null;
    const maxValue = Math.max(calculateResults.outputNew, calculateResults.outputOld);
    const oldWidth = Math.max((calculateResults.outputOld / maxValue) * 100, 5);
    const newWidth = Math.max((calculateResults.outputNew / maxValue) * 100, 5);
    return { oldWidth, newWidth, oldValue: calculateResults.outputOld, newValue: calculateResults.outputNew };
  }, [calculateResults]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (value) validateName(value);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value) validateEmail(value);
  };

  const handleModalSubmit = async () => {
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    
    if (!isNameValid || !isEmailValid) {
      return;
    }

    const data = {
      name,
      email,
      phone,
      language,
      currency,
      productType: productTypeKey,
      productState: productStateKey,
      monthlyProduction: parseFloat(monthlyProduction),
      materialPrice: parseFloat(materialPrice),
      currentYield: parseFloat(currentYield),
      targetYield: parseFloat(targetYield),
      machineSuggestion,
      results: calculateResults,
    };

    // Send to make.com webhook
    try {
      const response = await fetch('https://hook.us2.make.com/2tgypw8klty3xleg5pmi0i5nhghs35oo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        // Success: Close modal and reset form
        setIsModalOpen(false);
        setName("");
        setEmail("");
        setPhone("");
        setNameError("");
        setEmailError("");
        
        // Success message
        alert(
          language === "de" 
            ? "Vielen Dank! Ihre Daten wurden erfolgreich übermittelt." 
            : language === "en" 
            ? "Thank you! Your data has been submitted successfully." 
            : "¡Gracias! Sus datos han sido enviados correctamente."
        );
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error("Error sending data to webhook:", error);
      alert(
        language === "de" 
          ? "Fehler beim Senden der Daten. Bitte versuchen Sie es erneut." 
          : language === "en" 
          ? "Error sending data. Please try again." 
          : "Error al enviar los datos. Por favor, inténtelo de nuevo."
      );
    }
  };

  const stepTitle = () => {
    switch (currentStep) {
      case 1:
        return t.currency;
      case 2:
        return `${t.productType} & ${t.productState}`;
      case 3:
        return `${t.monthlyProduction} / ${t.materialPrice}`;
      case 4:
        return `${t.currentYield} & ${t.targetYield}`;
      case 5:
        return t.potential;
      default:
        return t.potential;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-base font-semibold text-foreground block">{t.currency}</label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="w-full h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]">
                  <SelectValue placeholder={language === "de" ? "Währung wählen" : language === "en" ? "Select currency" : "Seleccionar moneda"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">{t.currencyEur}</SelectItem>
                  <SelectItem value="USD">{t.currencyUsd}</SelectItem>
                  <SelectItem value="GBP">{t.currencyGbp}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-base font-semibold text-foreground block">{t.productType}</label>
              <Select value={productTypeKey} onValueChange={setProductTypeKey}>
                <SelectTrigger className="w-full h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]">
                  <SelectValue placeholder={language === "de" ? "Produkt wählen" : language === "en" ? "Select product" : "Seleccionar producto"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fish">{t.fish}</SelectItem>
                  <SelectItem value="pork">{t.pork}</SelectItem>
                  <SelectItem value="beef">{t.beef}</SelectItem>
                  <SelectItem value="poultry">{t.poultry}</SelectItem>
                  <SelectItem value="vegan">{t.vegan}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <label className="text-base font-semibold text-foreground block">{t.productState}</label>
              <Select value={productStateKey} onValueChange={setProductStateKey}>
                <SelectTrigger className="w-full h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]">
                  <SelectValue placeholder={language === "de" ? "Zustand wählen" : language === "en" ? "Select condition" : "Seleccionar estado"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fresh">{t.fresh}</SelectItem>
                  <SelectItem value="frozen">{t.frozen}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-base font-semibold text-foreground block">{t.monthlyProduction}</label>
              <Input
                type="number"
                value={monthlyProduction}
                onChange={(e) => setMonthlyProduction(e.target.value)}
                placeholder="100000"
                className="h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]"
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-base font-semibold text-foreground block">
                {t.materialPrice.replace("€", currency === "EUR" ? "€" : currency === "USD" ? "$" : "£")}
              </label>
              <Input
                type="number"
                step="0.01"
                value={materialPrice}
                onChange={(e) => setMaterialPrice(e.target.value)}
                placeholder="1.50"
                className="h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]"
                inputMode="decimal"
                required
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-base font-semibold text-foreground block">{t.currentYield}</label>
              <Input
                type="number"
                step="0.1"
                value={currentYield}
                onChange={(e) => setCurrentYield(e.target.value)}
                placeholder="98.0"
                className="h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]"
                inputMode="decimal"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-base font-semibold text-foreground block">{t.targetYield}</label>
              <Input
                type="number"
                step="0.1"
                value={targetYield}
                onChange={(e) => setTargetYield(e.target.value)}
                placeholder="99.5"
                className="h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]"
                inputMode="decimal"
                required
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8">
            {calculateResults ? (
              <>
                {/* Main Profit Display */}
                <div className="space-y-3 text-center py-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-100">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.additionalProfitPerYear}</p>
                  <p className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight" style={{ color: '#C41230' }}>
                    {formatCurrency(calculateResults.profitPerYear)}
                  </p>
                  <p className="text-base text-muted-foreground">
                    {t.monthly}: <span className="font-semibold text-foreground">{formatCurrency(calculateResults.profitPerMonth)}</span>
                  </p>
                </div>

                {/* Chart - Output Comparison */}
                <div className="space-y-5 bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-100 shadow-sm">
                  <p className="text-lg font-bold text-foreground mb-6">Produktionsvergleich</p>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-foreground">Aktueller Output</span>
                        <span className="text-lg font-bold text-foreground">{formatNumber(calculateResults.outputOld)} kg</span>
                      </div>
                      <div className="h-8 rounded-full bg-gray-200 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                          style={{ 
                            width: `${chartData?.oldWidth ?? 0}%`,
                            backgroundColor: '#2B2B2B'
                          }}
                        >
                          <span className="text-xs font-semibold text-white">{chartData?.oldWidth.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-foreground">Output mit neuer Technologie</span>
                        <span className="text-lg font-bold" style={{ color: '#C41230' }}>{formatNumber(calculateResults.outputNew)} kg</span>
                      </div>
                      <div className="h-8 rounded-full bg-gray-200 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                          style={{ 
                            width: `${chartData?.newWidth ?? 0}%`,
                            backgroundColor: '#C41230'
                          }}
                        >
                          <span className="text-xs font-semibold text-white">{chartData?.newWidth.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="rounded-xl border-2 p-6 shadow-sm bg-white hover:shadow-md transition-shadow">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">{t.moreProduct}</p>
                    <p className="text-3xl font-bold text-foreground">{formatNumber(calculateResults.outputDiff)} {t.kg}</p>
                  </div>
                  <div className="rounded-xl border-2 p-6 shadow-sm bg-white hover:shadow-md transition-shadow">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">{t.paybackTime}</p>
                    <p className="text-3xl font-bold" style={{ color: '#C41230' }}>
                      {formatPaybackTime(calculateResults.paybackTime)}
                    </p>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="rounded-2xl border-2 p-8 shadow-lg" style={{ backgroundColor: '#1A1A1A', borderColor: '#C41230' }}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-3">
                      <p className="text-sm uppercase tracking-wider font-bold" style={{ color: '#FFFFFF' }}>
                        {t.recommendationTitle}
                      </p>
                      <p className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>{suggestedMachineLabel}</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#D9D9D9' }}>
                        {t.recommendationDesc(suggestedMachineLabel)}
                      </p>
                    </div>
                    <Button
                      className="h-12 px-8 font-bold text-base shadow-lg hover:shadow-xl transition-all"
                      style={{ 
                        backgroundColor: '#C41230',
                        color: '#FFFFFF'
                      }}
                      asChild
                    >
                      <a href={t.machineLinks[machineSuggestion]} target="_blank" rel="noreferrer">
                        {t.recommendationCta}
                      </a>
                    </Button>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                  style={{ 
                    backgroundColor: '#C41230',
                    color: '#FFFFFF'
                  }}
                >
                  {t.saveAnalysis}
                </Button>

                {/* Disclaimer */}
                <p className="text-xs text-muted-foreground leading-relaxed text-center">{t.disclaimer}</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-12">
                {language === "de" && "Bitte Eingaben prüfen, um das Ergebnis zu sehen."}
                {language === "en" && "Please check your inputs to see the result."}
                {language === "es" && "Revise sus datos para ver el resultado."}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-[#1A1A1A] to-[#2B2B2B] bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t.subtitle}</p>
        </div>
        <LanguageSwitcher language={language} onLanguageChange={setLanguage} className="hidden sm:flex" />
      </div>

      <div className="mb-6 sm:hidden flex justify-end">
        <LanguageSwitcher language={language} onLanguageChange={setLanguage} />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">
          {t.stepLabel(currentStep, totalSteps)}
        </p>
        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden shadow-inner">
          <div
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{ 
              width: `${(currentStep / totalSteps) * 100}%`,
              backgroundColor: '#C41230'
            }}
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-xl border-2 border-gray-200 bg-white">
        <CardHeader className="py-6 px-6 sm:px-8" style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #E5E5E5' }}>
          <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">{stepTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-8 px-6 sm:px-8 pb-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
            {currentStep === 5 ? (
              <>
                <Button
                  variant="outline"
                  className="h-12 font-semibold border-2 hover:bg-gray-50"
                  onClick={goBack}
                  style={{ 
                    borderColor: '#2B2B2B',
                    color: '#1A1A1A'
                  }}
                >
                  {t.back}
                </Button>
                <Button
                  className="h-12 px-8 font-semibold shadow-lg hover:shadow-xl transition-all"
                  style={{ 
                    backgroundColor: '#C41230',
                    color: '#FFFFFF'
                  }}
                  asChild
                >
                  <a href="https://maku-meattec.com/" target="_blank" rel="noreferrer">
                    {language === "de" ? "Zur Homepage" : language === "en" ? "To Homepage" : "A la página principal"}
                  </a>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-12 font-semibold border-2 hover:bg-gray-50 disabled:opacity-40"
                  onClick={goBack}
                  disabled={currentStep === 1}
                  style={{ 
                    borderColor: currentStep === 1 ? '#9CA3AF' : '#2B2B2B',
                    color: currentStep === 1 ? '#9CA3AF' : '#1A1A1A'
                  }}
                >
                  {t.back}
                </Button>
                <Button
                  className="h-12 px-8 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={goNext}
                  disabled={!isStepValid(currentStep)}
                  style={{ 
                    backgroundColor: isStepValid(currentStep) ? '#C41230' : '#9CA3AF',
                    color: '#FFFFFF'
                  }}
                >
                  {t.next}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t.modalTitle}</DialogTitle>
            <DialogDescription className="text-base">{t.modalDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold leading-none text-foreground">
                {t.nameLabel}
              </label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t.namePlaceholder}
                className="h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]"
                onBlur={() => name && validateName(name)}
              />
              {nameError && (
                <p className="text-xs text-[#C41230] font-medium">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold leading-none text-foreground">
                {t.emailLabel}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]"
                onBlur={() => email && validateEmail(email)}
              />
              {emailError && (
                <p className="text-xs text-[#C41230] font-medium">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold leading-none text-foreground">
                {t.phoneLabel} <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                className="h-12 text-base border-2 focus:ring-2 focus:ring-[#C41230]"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setNameError("");
                setEmailError("");
              }}
              className="w-full sm:w-auto h-12 font-semibold border-2"
              style={{ 
                borderColor: '#2B2B2B',
                color: '#1A1A1A'
              }}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleModalSubmit}
              disabled={!name || !email || !!nameError || !!emailError}
              className="w-full sm:w-auto h-12 px-8 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              style={{ 
                backgroundColor: '#C41230',
                color: '#FFFFFF'
              }}
            >
              {t.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
