declare namespace _default {
    let $schema: string;
    let $comment: string;
    namespace definitions {
        export namespace OptionsResult {
            let type: string;
            namespace properties {
                namespace underlyingSymbol {
                    let type_1: string;
                    export { type_1 as type };
                }
                namespace expirationDates {
                    let type_2: string;
                    export { type_2 as type };
                    export namespace items {
                        let type_3: string;
                        export { type_3 as type };
                        export let format: string;
                    }
                }
                namespace strikes {
                    let type_4: string;
                    export { type_4 as type };
                    export namespace items_1 {
                        let type_5: string;
                        export { type_5 as type };
                    }
                    export { items_1 as items };
                }
                namespace hasMiniOptions {
                    let type_6: string;
                    export { type_6 as type };
                }
                namespace quote {
                    let $ref: string;
                }
                namespace options {
                    let type_7: string;
                    export { type_7 as type };
                    export namespace items_2 {
                        let $ref_1: string;
                        export { $ref_1 as $ref };
                    }
                    export { items_2 as items };
                }
            }
            let required: string[];
            let additionalProperties: {};
        }
        export namespace Quote {
            let type_8: string;
            export { type_8 as type };
            export namespace discriminator {
                let propertyName: string;
            }
            let required_1: string[];
            export { required_1 as required };
            export let oneOf: {
                $ref: string;
            }[];
        }
        export namespace QuoteAltSymbol {
            let type_9: string;
            export { type_9 as type };
            export namespace properties_1 {
                export namespace language {
                    let type_10: string;
                    export { type_10 as type };
                }
                export namespace region {
                    let type_11: string;
                    export { type_11 as type };
                }
                export namespace quoteType {
                    let type_12: string;
                    export { type_12 as type };
                    let _const: string;
                    export { _const as const };
                }
                export namespace typeDisp {
                    let type_13: string;
                    export { type_13 as type };
                    let _const_1: string;
                    export { _const_1 as const };
                }
                export namespace quoteSourceName {
                    let type_14: string;
                    export { type_14 as type };
                }
                export namespace triggerable {
                    let type_15: string;
                    export { type_15 as type };
                }
                export namespace currency {
                    let type_16: string;
                    export { type_16 as type };
                }
                export namespace customPriceAlertConfidence {
                    let type_17: string;
                    export { type_17 as type };
                }
                export namespace marketState {
                    let type_18: string;
                    export { type_18 as type };
                    let _enum: string[];
                    export { _enum as enum };
                }
                export namespace tradeable {
                    let type_19: string;
                    export { type_19 as type };
                }
                export namespace cryptoTradeable {
                    let type_20: string;
                    export { type_20 as type };
                }
                export namespace corporateActions {
                    let type_21: string;
                    export { type_21 as type };
                    let items_3: {};
                    export { items_3 as items };
                }
                export namespace exchange {
                    let type_22: string;
                    export { type_22 as type };
                }
                export namespace shortName {
                    let type_23: string;
                    export { type_23 as type };
                }
                export namespace longName {
                    let type_24: string;
                    export { type_24 as type };
                }
                export namespace messageBoardId {
                    let type_25: string;
                    export { type_25 as type };
                }
                export namespace exchangeTimezoneName {
                    let type_26: string;
                    export { type_26 as type };
                }
                export namespace exchangeTimezoneShortName {
                    let type_27: string;
                    export { type_27 as type };
                }
                export namespace gmtOffSetMilliseconds {
                    let type_28: string;
                    export { type_28 as type };
                }
                export namespace market {
                    let type_29: string;
                    export { type_29 as type };
                }
                export namespace esgPopulated {
                    let type_30: string;
                    export { type_30 as type };
                }
                export namespace fiftyTwoWeekLowChange {
                    let type_31: string;
                    export { type_31 as type };
                }
                export namespace fiftyTwoWeekLowChangePercent {
                    let type_32: string;
                    export { type_32 as type };
                }
                export namespace fiftyTwoWeekRange {
                    let $ref_2: string;
                    export { $ref_2 as $ref };
                }
                export namespace fiftyTwoWeekHighChange {
                    let type_33: string;
                    export { type_33 as type };
                }
                export namespace fiftyTwoWeekHighChangePercent {
                    let type_34: string;
                    export { type_34 as type };
                }
                export namespace fiftyTwoWeekLow {
                    let type_35: string;
                    export { type_35 as type };
                }
                export namespace fiftyTwoWeekHigh {
                    let type_36: string;
                    export { type_36 as type };
                }
                export namespace fiftyTwoWeekChangePercent {
                    let type_37: string;
                    export { type_37 as type };
                }
                export namespace dividendDate {
                    let type_38: string;
                    export { type_38 as type };
                    let format_1: string;
                    export { format_1 as format };
                }
                export namespace earningsTimestamp {
                    let type_39: string;
                    export { type_39 as type };
                    let format_2: string;
                    export { format_2 as format };
                }
                export namespace earningsTimestampStart {
                    let type_40: string;
                    export { type_40 as type };
                    let format_3: string;
                    export { format_3 as format };
                }
                export namespace earningsTimestampEnd {
                    let type_41: string;
                    export { type_41 as type };
                    let format_4: string;
                    export { format_4 as format };
                }
                export namespace earningsCallTimestampStart {
                    let type_42: string;
                    export { type_42 as type };
                    let format_5: string;
                    export { format_5 as format };
                }
                export namespace earningsCallTimestampEnd {
                    let type_43: string;
                    export { type_43 as type };
                    let format_6: string;
                    export { format_6 as format };
                }
                export namespace isEarningsDateEstimate {
                    let type_44: string;
                    export { type_44 as type };
                }
                export namespace trailingAnnualDividendRate {
                    let type_45: string;
                    export { type_45 as type };
                }
                export namespace trailingPE {
                    let type_46: string;
                    export { type_46 as type };
                }
                export namespace trailingAnnualDividendYield {
                    let type_47: string;
                    export { type_47 as type };
                }
                export namespace epsTrailingTwelveMonths {
                    let type_48: string;
                    export { type_48 as type };
                }
                export namespace epsForward {
                    let type_49: string;
                    export { type_49 as type };
                }
                export namespace epsCurrentYear {
                    let type_50: string;
                    export { type_50 as type };
                }
                export namespace priceEpsCurrentYear {
                    let type_51: string;
                    export { type_51 as type };
                }
                export namespace sharesOutstanding {
                    let type_52: string;
                    export { type_52 as type };
                }
                export namespace bookValue {
                    let type_53: string;
                    export { type_53 as type };
                }
                export namespace fiftyDayAverage {
                    let type_54: string;
                    export { type_54 as type };
                }
                export namespace fiftyDayAverageChange {
                    let type_55: string;
                    export { type_55 as type };
                }
                export namespace fiftyDayAverageChangePercent {
                    let type_56: string;
                    export { type_56 as type };
                }
                export namespace twoHundredDayAverage {
                    let type_57: string;
                    export { type_57 as type };
                }
                export namespace twoHundredDayAverageChange {
                    let type_58: string;
                    export { type_58 as type };
                }
                export namespace twoHundredDayAverageChangePercent {
                    let type_59: string;
                    export { type_59 as type };
                }
                export namespace marketCap {
                    let type_60: string;
                    export { type_60 as type };
                }
                export namespace forwardPE {
                    let type_61: string;
                    export { type_61 as type };
                }
                export namespace priceToBook {
                    let type_62: string;
                    export { type_62 as type };
                }
                export namespace sourceInterval {
                    let type_63: string;
                    export { type_63 as type };
                }
                export namespace exchangeDataDelayedBy {
                    let type_64: string;
                    export { type_64 as type };
                }
                export namespace firstTradeDateMilliseconds {
                    let $ref_3: string;
                    export { $ref_3 as $ref };
                }
                export namespace priceHint {
                    let type_65: string;
                    export { type_65 as type };
                }
                export namespace postMarketChangePercent {
                    let type_66: string;
                    export { type_66 as type };
                }
                export namespace postMarketTime {
                    let type_67: string;
                    export { type_67 as type };
                    let format_7: string;
                    export { format_7 as format };
                }
                export namespace postMarketPrice {
                    let type_68: string;
                    export { type_68 as type };
                }
                export namespace postMarketChange {
                    let type_69: string;
                    export { type_69 as type };
                }
                export namespace hasPrePostMarketData {
                    let type_70: string;
                    export { type_70 as type };
                }
                export namespace extendedMarketChange {
                    let type_71: string;
                    export { type_71 as type };
                }
                export namespace extendedMarketChangePercent {
                    let type_72: string;
                    export { type_72 as type };
                }
                export namespace extendedMarketPrice {
                    let type_73: string;
                    export { type_73 as type };
                }
                export namespace extendedMarketTime {
                    let type_74: string;
                    export { type_74 as type };
                    let format_8: string;
                    export { format_8 as format };
                }
                export namespace regularMarketChange {
                    let type_75: string;
                    export { type_75 as type };
                }
                export namespace regularMarketChangePercent {
                    let type_76: string;
                    export { type_76 as type };
                }
                export namespace regularMarketTime {
                    let type_77: string;
                    export { type_77 as type };
                    let format_9: string;
                    export { format_9 as format };
                }
                export namespace regularMarketPrice {
                    let type_78: string;
                    export { type_78 as type };
                }
                export namespace regularMarketDayHigh {
                    let type_79: string;
                    export { type_79 as type };
                }
                export namespace regularMarketDayRange {
                    let $ref_4: string;
                    export { $ref_4 as $ref };
                }
                export namespace regularMarketDayLow {
                    let type_80: string;
                    export { type_80 as type };
                }
                export namespace regularMarketVolume {
                    let type_81: string;
                    export { type_81 as type };
                }
                export namespace dayHigh {
                    let type_82: string;
                    export { type_82 as type };
                }
                export namespace dayLow {
                    let type_83: string;
                    export { type_83 as type };
                }
                export namespace volume {
                    let type_84: string;
                    export { type_84 as type };
                }
                export namespace regularMarketPreviousClose {
                    let type_85: string;
                    export { type_85 as type };
                }
                export namespace preMarketChange {
                    let type_86: string;
                    export { type_86 as type };
                }
                export namespace preMarketChangePercent {
                    let type_87: string;
                    export { type_87 as type };
                }
                export namespace preMarketTime {
                    let type_88: string;
                    export { type_88 as type };
                    let format_10: string;
                    export { format_10 as format };
                }
                export namespace preMarketPrice {
                    let type_89: string;
                    export { type_89 as type };
                }
                export namespace bid {
                    let type_90: string;
                    export { type_90 as type };
                }
                export namespace ask {
                    let type_91: string;
                    export { type_91 as type };
                }
                export namespace bidSize {
                    let type_92: string;
                    export { type_92 as type };
                }
                export namespace askSize {
                    let type_93: string;
                    export { type_93 as type };
                }
                export namespace fullExchangeName {
                    let type_94: string;
                    export { type_94 as type };
                }
                export namespace financialCurrency {
                    let type_95: string;
                    export { type_95 as type };
                }
                export namespace regularMarketOpen {
                    let type_96: string;
                    export { type_96 as type };
                }
                export namespace averageDailyVolume3Month {
                    let type_97: string;
                    export { type_97 as type };
                }
                export namespace averageDailyVolume10Day {
                    let type_98: string;
                    export { type_98 as type };
                }
                export namespace displayName {
                    let type_99: string;
                    export { type_99 as type };
                }
                export namespace symbol {
                    let type_100: string;
                    export { type_100 as type };
                }
                export namespace underlyingSymbol_1 {
                    let type_101: string;
                    export { type_101 as type };
                }
                export { underlyingSymbol_1 as underlyingSymbol };
                export namespace ytdReturn {
                    let type_102: string;
                    export { type_102 as type };
                }
                export namespace trailingThreeMonthReturns {
                    let type_103: string;
                    export { type_103 as type };
                }
                export namespace trailingThreeMonthNavReturns {
                    let type_104: string;
                    export { type_104 as type };
                }
                export namespace ipoExpectedDate {
                    let type_105: string;
                    export { type_105 as type };
                    let format_11: string;
                    export { format_11 as format };
                }
                export namespace newListingDate {
                    let type_106: string;
                    export { type_106 as type };
                    let format_12: string;
                    export { format_12 as format };
                }
                export namespace nameChangeDate {
                    let type_107: string;
                    export { type_107 as type };
                    let format_13: string;
                    export { format_13 as format };
                }
                export namespace prevName {
                    let type_108: string;
                    export { type_108 as type };
                }
                export namespace averageAnalystRating {
                    let type_109: string;
                    export { type_109 as type };
                }
                export namespace pageViewGrowthWeekly {
                    let type_110: string;
                    export { type_110 as type };
                }
                export namespace openInterest {
                    let type_111: string;
                    export { type_111 as type };
                }
                export namespace beta {
                    let type_112: string;
                    export { type_112 as type };
                }
                export namespace companyLogoUrl {
                    let type_113: string;
                    export { type_113 as type };
                }
                export namespace logoUrl {
                    let type_114: string;
                    export { type_114 as type };
                }
                export namespace underlyingExchangeSymbol {
                    let type_115: string;
                    export { type_115 as type };
                }
                export namespace expireDate {
                    let type_116: string;
                    export { type_116 as type };
                    let format_14: string;
                    export { format_14 as format };
                }
                export namespace expireIsoDate {
                    let type_117: string;
                    export { type_117 as type };
                }
            }
            export { properties_1 as properties };
            let required_2: string[];
            export { required_2 as required };
        }
        export namespace QuoteBase {
            let type_118: string;
            export { type_118 as type };
            export namespace properties_2 {
                export namespace language_1 {
                    let type_119: string;
                    export { type_119 as type };
                }
                export { language_1 as language };
                export namespace region_1 {
                    let type_120: string;
                    export { type_120 as type };
                }
                export { region_1 as region };
                export namespace quoteType_1 {
                    let type_121: string;
                    export { type_121 as type };
                }
                export { quoteType_1 as quoteType };
                export namespace typeDisp_1 {
                    let type_122: string;
                    export { type_122 as type };
                }
                export { typeDisp_1 as typeDisp };
                export namespace quoteSourceName_1 {
                    let type_123: string;
                    export { type_123 as type };
                }
                export { quoteSourceName_1 as quoteSourceName };
                export namespace triggerable_1 {
                    let type_124: string;
                    export { type_124 as type };
                }
                export { triggerable_1 as triggerable };
                export namespace currency_1 {
                    let type_125: string;
                    export { type_125 as type };
                }
                export { currency_1 as currency };
                export namespace customPriceAlertConfidence_1 {
                    let type_126: string;
                    export { type_126 as type };
                }
                export { customPriceAlertConfidence_1 as customPriceAlertConfidence };
                export namespace marketState_1 {
                    let type_127: string;
                    export { type_127 as type };
                    let _enum_1: string[];
                    export { _enum_1 as enum };
                }
                export { marketState_1 as marketState };
                export namespace tradeable_1 {
                    let type_128: string;
                    export { type_128 as type };
                }
                export { tradeable_1 as tradeable };
                export namespace cryptoTradeable_1 {
                    let type_129: string;
                    export { type_129 as type };
                }
                export { cryptoTradeable_1 as cryptoTradeable };
                export namespace corporateActions_1 {
                    let type_130: string;
                    export { type_130 as type };
                    let items_4: {};
                    export { items_4 as items };
                }
                export { corporateActions_1 as corporateActions };
                export namespace exchange_1 {
                    let type_131: string;
                    export { type_131 as type };
                }
                export { exchange_1 as exchange };
                export namespace shortName_1 {
                    let type_132: string;
                    export { type_132 as type };
                }
                export { shortName_1 as shortName };
                export namespace longName_1 {
                    let type_133: string;
                    export { type_133 as type };
                }
                export { longName_1 as longName };
                export namespace messageBoardId_1 {
                    let type_134: string;
                    export { type_134 as type };
                }
                export { messageBoardId_1 as messageBoardId };
                export namespace exchangeTimezoneName_1 {
                    let type_135: string;
                    export { type_135 as type };
                }
                export { exchangeTimezoneName_1 as exchangeTimezoneName };
                export namespace exchangeTimezoneShortName_1 {
                    let type_136: string;
                    export { type_136 as type };
                }
                export { exchangeTimezoneShortName_1 as exchangeTimezoneShortName };
                export namespace gmtOffSetMilliseconds_1 {
                    let type_137: string;
                    export { type_137 as type };
                }
                export { gmtOffSetMilliseconds_1 as gmtOffSetMilliseconds };
                export namespace market_1 {
                    let type_138: string;
                    export { type_138 as type };
                }
                export { market_1 as market };
                export namespace esgPopulated_1 {
                    let type_139: string;
                    export { type_139 as type };
                }
                export { esgPopulated_1 as esgPopulated };
                export namespace fiftyTwoWeekLowChange_1 {
                    let type_140: string;
                    export { type_140 as type };
                }
                export { fiftyTwoWeekLowChange_1 as fiftyTwoWeekLowChange };
                export namespace fiftyTwoWeekLowChangePercent_1 {
                    let type_141: string;
                    export { type_141 as type };
                }
                export { fiftyTwoWeekLowChangePercent_1 as fiftyTwoWeekLowChangePercent };
                export namespace fiftyTwoWeekRange_1 {
                    let $ref_5: string;
                    export { $ref_5 as $ref };
                }
                export { fiftyTwoWeekRange_1 as fiftyTwoWeekRange };
                export namespace fiftyTwoWeekHighChange_1 {
                    let type_142: string;
                    export { type_142 as type };
                }
                export { fiftyTwoWeekHighChange_1 as fiftyTwoWeekHighChange };
                export namespace fiftyTwoWeekHighChangePercent_1 {
                    let type_143: string;
                    export { type_143 as type };
                }
                export { fiftyTwoWeekHighChangePercent_1 as fiftyTwoWeekHighChangePercent };
                export namespace fiftyTwoWeekLow_1 {
                    let type_144: string;
                    export { type_144 as type };
                }
                export { fiftyTwoWeekLow_1 as fiftyTwoWeekLow };
                export namespace fiftyTwoWeekHigh_1 {
                    let type_145: string;
                    export { type_145 as type };
                }
                export { fiftyTwoWeekHigh_1 as fiftyTwoWeekHigh };
                export namespace fiftyTwoWeekChangePercent_1 {
                    let type_146: string;
                    export { type_146 as type };
                }
                export { fiftyTwoWeekChangePercent_1 as fiftyTwoWeekChangePercent };
                export namespace dividendDate_1 {
                    let type_147: string;
                    export { type_147 as type };
                    let format_15: string;
                    export { format_15 as format };
                }
                export { dividendDate_1 as dividendDate };
                export namespace earningsTimestamp_1 {
                    let type_148: string;
                    export { type_148 as type };
                    let format_16: string;
                    export { format_16 as format };
                }
                export { earningsTimestamp_1 as earningsTimestamp };
                export namespace earningsTimestampStart_1 {
                    let type_149: string;
                    export { type_149 as type };
                    let format_17: string;
                    export { format_17 as format };
                }
                export { earningsTimestampStart_1 as earningsTimestampStart };
                export namespace earningsTimestampEnd_1 {
                    let type_150: string;
                    export { type_150 as type };
                    let format_18: string;
                    export { format_18 as format };
                }
                export { earningsTimestampEnd_1 as earningsTimestampEnd };
                export namespace earningsCallTimestampStart_1 {
                    let type_151: string;
                    export { type_151 as type };
                    let format_19: string;
                    export { format_19 as format };
                }
                export { earningsCallTimestampStart_1 as earningsCallTimestampStart };
                export namespace earningsCallTimestampEnd_1 {
                    let type_152: string;
                    export { type_152 as type };
                    let format_20: string;
                    export { format_20 as format };
                }
                export { earningsCallTimestampEnd_1 as earningsCallTimestampEnd };
                export namespace isEarningsDateEstimate_1 {
                    let type_153: string;
                    export { type_153 as type };
                }
                export { isEarningsDateEstimate_1 as isEarningsDateEstimate };
                export namespace trailingAnnualDividendRate_1 {
                    let type_154: string;
                    export { type_154 as type };
                }
                export { trailingAnnualDividendRate_1 as trailingAnnualDividendRate };
                export namespace trailingPE_1 {
                    let type_155: string;
                    export { type_155 as type };
                }
                export { trailingPE_1 as trailingPE };
                export namespace trailingAnnualDividendYield_1 {
                    let type_156: string;
                    export { type_156 as type };
                }
                export { trailingAnnualDividendYield_1 as trailingAnnualDividendYield };
                export namespace epsTrailingTwelveMonths_1 {
                    let type_157: string;
                    export { type_157 as type };
                }
                export { epsTrailingTwelveMonths_1 as epsTrailingTwelveMonths };
                export namespace epsForward_1 {
                    let type_158: string;
                    export { type_158 as type };
                }
                export { epsForward_1 as epsForward };
                export namespace epsCurrentYear_1 {
                    let type_159: string;
                    export { type_159 as type };
                }
                export { epsCurrentYear_1 as epsCurrentYear };
                export namespace priceEpsCurrentYear_1 {
                    let type_160: string;
                    export { type_160 as type };
                }
                export { priceEpsCurrentYear_1 as priceEpsCurrentYear };
                export namespace sharesOutstanding_1 {
                    let type_161: string;
                    export { type_161 as type };
                }
                export { sharesOutstanding_1 as sharesOutstanding };
                export namespace bookValue_1 {
                    let type_162: string;
                    export { type_162 as type };
                }
                export { bookValue_1 as bookValue };
                export namespace fiftyDayAverage_1 {
                    let type_163: string;
                    export { type_163 as type };
                }
                export { fiftyDayAverage_1 as fiftyDayAverage };
                export namespace fiftyDayAverageChange_1 {
                    let type_164: string;
                    export { type_164 as type };
                }
                export { fiftyDayAverageChange_1 as fiftyDayAverageChange };
                export namespace fiftyDayAverageChangePercent_1 {
                    let type_165: string;
                    export { type_165 as type };
                }
                export { fiftyDayAverageChangePercent_1 as fiftyDayAverageChangePercent };
                export namespace twoHundredDayAverage_1 {
                    let type_166: string;
                    export { type_166 as type };
                }
                export { twoHundredDayAverage_1 as twoHundredDayAverage };
                export namespace twoHundredDayAverageChange_1 {
                    let type_167: string;
                    export { type_167 as type };
                }
                export { twoHundredDayAverageChange_1 as twoHundredDayAverageChange };
                export namespace twoHundredDayAverageChangePercent_1 {
                    let type_168: string;
                    export { type_168 as type };
                }
                export { twoHundredDayAverageChangePercent_1 as twoHundredDayAverageChangePercent };
                export namespace marketCap_1 {
                    let type_169: string;
                    export { type_169 as type };
                }
                export { marketCap_1 as marketCap };
                export namespace forwardPE_1 {
                    let type_170: string;
                    export { type_170 as type };
                }
                export { forwardPE_1 as forwardPE };
                export namespace priceToBook_1 {
                    let type_171: string;
                    export { type_171 as type };
                }
                export { priceToBook_1 as priceToBook };
                export namespace sourceInterval_1 {
                    let type_172: string;
                    export { type_172 as type };
                }
                export { sourceInterval_1 as sourceInterval };
                export namespace exchangeDataDelayedBy_1 {
                    let type_173: string;
                    export { type_173 as type };
                }
                export { exchangeDataDelayedBy_1 as exchangeDataDelayedBy };
                export namespace firstTradeDateMilliseconds_1 {
                    let $ref_6: string;
                    export { $ref_6 as $ref };
                }
                export { firstTradeDateMilliseconds_1 as firstTradeDateMilliseconds };
                export namespace priceHint_1 {
                    let type_174: string;
                    export { type_174 as type };
                }
                export { priceHint_1 as priceHint };
                export namespace postMarketChangePercent_1 {
                    let type_175: string;
                    export { type_175 as type };
                }
                export { postMarketChangePercent_1 as postMarketChangePercent };
                export namespace postMarketTime_1 {
                    let type_176: string;
                    export { type_176 as type };
                    let format_21: string;
                    export { format_21 as format };
                }
                export { postMarketTime_1 as postMarketTime };
                export namespace postMarketPrice_1 {
                    let type_177: string;
                    export { type_177 as type };
                }
                export { postMarketPrice_1 as postMarketPrice };
                export namespace postMarketChange_1 {
                    let type_178: string;
                    export { type_178 as type };
                }
                export { postMarketChange_1 as postMarketChange };
                export namespace hasPrePostMarketData_1 {
                    let type_179: string;
                    export { type_179 as type };
                }
                export { hasPrePostMarketData_1 as hasPrePostMarketData };
                export namespace extendedMarketChange_1 {
                    let type_180: string;
                    export { type_180 as type };
                }
                export { extendedMarketChange_1 as extendedMarketChange };
                export namespace extendedMarketChangePercent_1 {
                    let type_181: string;
                    export { type_181 as type };
                }
                export { extendedMarketChangePercent_1 as extendedMarketChangePercent };
                export namespace extendedMarketPrice_1 {
                    let type_182: string;
                    export { type_182 as type };
                }
                export { extendedMarketPrice_1 as extendedMarketPrice };
                export namespace extendedMarketTime_1 {
                    let type_183: string;
                    export { type_183 as type };
                    let format_22: string;
                    export { format_22 as format };
                }
                export { extendedMarketTime_1 as extendedMarketTime };
                export namespace regularMarketChange_1 {
                    let type_184: string;
                    export { type_184 as type };
                }
                export { regularMarketChange_1 as regularMarketChange };
                export namespace regularMarketChangePercent_1 {
                    let type_185: string;
                    export { type_185 as type };
                }
                export { regularMarketChangePercent_1 as regularMarketChangePercent };
                export namespace regularMarketTime_1 {
                    let type_186: string;
                    export { type_186 as type };
                    let format_23: string;
                    export { format_23 as format };
                }
                export { regularMarketTime_1 as regularMarketTime };
                export namespace regularMarketPrice_1 {
                    let type_187: string;
                    export { type_187 as type };
                }
                export { regularMarketPrice_1 as regularMarketPrice };
                export namespace regularMarketDayHigh_1 {
                    let type_188: string;
                    export { type_188 as type };
                }
                export { regularMarketDayHigh_1 as regularMarketDayHigh };
                export namespace regularMarketDayRange_1 {
                    let $ref_7: string;
                    export { $ref_7 as $ref };
                }
                export { regularMarketDayRange_1 as regularMarketDayRange };
                export namespace regularMarketDayLow_1 {
                    let type_189: string;
                    export { type_189 as type };
                }
                export { regularMarketDayLow_1 as regularMarketDayLow };
                export namespace regularMarketVolume_1 {
                    let type_190: string;
                    export { type_190 as type };
                }
                export { regularMarketVolume_1 as regularMarketVolume };
                export namespace dayHigh_1 {
                    let type_191: string;
                    export { type_191 as type };
                }
                export { dayHigh_1 as dayHigh };
                export namespace dayLow_1 {
                    let type_192: string;
                    export { type_192 as type };
                }
                export { dayLow_1 as dayLow };
                export namespace volume_1 {
                    let type_193: string;
                    export { type_193 as type };
                }
                export { volume_1 as volume };
                export namespace regularMarketPreviousClose_1 {
                    let type_194: string;
                    export { type_194 as type };
                }
                export { regularMarketPreviousClose_1 as regularMarketPreviousClose };
                export namespace preMarketChange_1 {
                    let type_195: string;
                    export { type_195 as type };
                }
                export { preMarketChange_1 as preMarketChange };
                export namespace preMarketChangePercent_1 {
                    let type_196: string;
                    export { type_196 as type };
                }
                export { preMarketChangePercent_1 as preMarketChangePercent };
                export namespace preMarketTime_1 {
                    let type_197: string;
                    export { type_197 as type };
                    let format_24: string;
                    export { format_24 as format };
                }
                export { preMarketTime_1 as preMarketTime };
                export namespace preMarketPrice_1 {
                    let type_198: string;
                    export { type_198 as type };
                }
                export { preMarketPrice_1 as preMarketPrice };
                export namespace bid_1 {
                    let type_199: string;
                    export { type_199 as type };
                }
                export { bid_1 as bid };
                export namespace ask_1 {
                    let type_200: string;
                    export { type_200 as type };
                }
                export { ask_1 as ask };
                export namespace bidSize_1 {
                    let type_201: string;
                    export { type_201 as type };
                }
                export { bidSize_1 as bidSize };
                export namespace askSize_1 {
                    let type_202: string;
                    export { type_202 as type };
                }
                export { askSize_1 as askSize };
                export namespace fullExchangeName_1 {
                    let type_203: string;
                    export { type_203 as type };
                }
                export { fullExchangeName_1 as fullExchangeName };
                export namespace financialCurrency_1 {
                    let type_204: string;
                    export { type_204 as type };
                }
                export { financialCurrency_1 as financialCurrency };
                export namespace regularMarketOpen_1 {
                    let type_205: string;
                    export { type_205 as type };
                }
                export { regularMarketOpen_1 as regularMarketOpen };
                export namespace averageDailyVolume3Month_1 {
                    let type_206: string;
                    export { type_206 as type };
                }
                export { averageDailyVolume3Month_1 as averageDailyVolume3Month };
                export namespace averageDailyVolume10Day_1 {
                    let type_207: string;
                    export { type_207 as type };
                }
                export { averageDailyVolume10Day_1 as averageDailyVolume10Day };
                export namespace displayName_1 {
                    let type_208: string;
                    export { type_208 as type };
                }
                export { displayName_1 as displayName };
                export namespace symbol_1 {
                    let type_209: string;
                    export { type_209 as type };
                }
                export { symbol_1 as symbol };
                export namespace underlyingSymbol_2 {
                    let type_210: string;
                    export { type_210 as type };
                }
                export { underlyingSymbol_2 as underlyingSymbol };
                export namespace ytdReturn_1 {
                    let type_211: string;
                    export { type_211 as type };
                }
                export { ytdReturn_1 as ytdReturn };
                export namespace trailingThreeMonthReturns_1 {
                    let type_212: string;
                    export { type_212 as type };
                }
                export { trailingThreeMonthReturns_1 as trailingThreeMonthReturns };
                export namespace trailingThreeMonthNavReturns_1 {
                    let type_213: string;
                    export { type_213 as type };
                }
                export { trailingThreeMonthNavReturns_1 as trailingThreeMonthNavReturns };
                export namespace ipoExpectedDate_1 {
                    let type_214: string;
                    export { type_214 as type };
                    let format_25: string;
                    export { format_25 as format };
                }
                export { ipoExpectedDate_1 as ipoExpectedDate };
                export namespace newListingDate_1 {
                    let type_215: string;
                    export { type_215 as type };
                    let format_26: string;
                    export { format_26 as format };
                }
                export { newListingDate_1 as newListingDate };
                export namespace nameChangeDate_1 {
                    let type_216: string;
                    export { type_216 as type };
                    let format_27: string;
                    export { format_27 as format };
                }
                export { nameChangeDate_1 as nameChangeDate };
                export namespace prevName_1 {
                    let type_217: string;
                    export { type_217 as type };
                }
                export { prevName_1 as prevName };
                export namespace averageAnalystRating_1 {
                    let type_218: string;
                    export { type_218 as type };
                }
                export { averageAnalystRating_1 as averageAnalystRating };
                export namespace pageViewGrowthWeekly_1 {
                    let type_219: string;
                    export { type_219 as type };
                }
                export { pageViewGrowthWeekly_1 as pageViewGrowthWeekly };
                export namespace openInterest_1 {
                    let type_220: string;
                    export { type_220 as type };
                }
                export { openInterest_1 as openInterest };
                export namespace beta_1 {
                    let type_221: string;
                    export { type_221 as type };
                }
                export { beta_1 as beta };
                export namespace companyLogoUrl_1 {
                    let type_222: string;
                    export { type_222 as type };
                }
                export { companyLogoUrl_1 as companyLogoUrl };
                export namespace logoUrl_1 {
                    let type_223: string;
                    export { type_223 as type };
                }
                export { logoUrl_1 as logoUrl };
            }
            export { properties_2 as properties };
            let required_3: string[];
            export { required_3 as required };
        }
        export namespace TwoNumberRange {
            let type_224: string;
            export { type_224 as type };
            export namespace properties_3 {
                namespace low {
                    let type_225: string;
                    export { type_225 as type };
                }
                namespace high {
                    let type_226: string;
                    export { type_226 as type };
                }
            }
            export { properties_3 as properties };
            let required_4: string[];
            export { required_4 as required };
            let additionalProperties_1: boolean;
            export { additionalProperties_1 as additionalProperties };
        }
        export namespace DateInMs {
            let type_227: string;
            export { type_227 as type };
            let format_28: string;
            export { format_28 as format };
        }
        export namespace QuoteCryptoCurrency {
            let type_228: string;
            export { type_228 as type };
            export namespace properties_4 {
                export namespace language_2 {
                    let type_229: string;
                    export { type_229 as type };
                }
                export { language_2 as language };
                export namespace region_2 {
                    let type_230: string;
                    export { type_230 as type };
                }
                export { region_2 as region };
                export namespace quoteType_2 {
                    let type_231: string;
                    export { type_231 as type };
                    let _const_2: string;
                    export { _const_2 as const };
                }
                export { quoteType_2 as quoteType };
                export namespace typeDisp_2 {
                    let type_232: string;
                    export { type_232 as type };
                }
                export { typeDisp_2 as typeDisp };
                export namespace quoteSourceName_2 {
                    let type_233: string;
                    export { type_233 as type };
                }
                export { quoteSourceName_2 as quoteSourceName };
                export namespace triggerable_2 {
                    let type_234: string;
                    export { type_234 as type };
                }
                export { triggerable_2 as triggerable };
                export namespace currency_2 {
                    let type_235: string;
                    export { type_235 as type };
                }
                export { currency_2 as currency };
                export namespace customPriceAlertConfidence_2 {
                    let type_236: string;
                    export { type_236 as type };
                }
                export { customPriceAlertConfidence_2 as customPriceAlertConfidence };
                export namespace marketState_2 {
                    let type_237: string;
                    export { type_237 as type };
                    let _enum_2: string[];
                    export { _enum_2 as enum };
                }
                export { marketState_2 as marketState };
                export namespace tradeable_2 {
                    let type_238: string;
                    export { type_238 as type };
                }
                export { tradeable_2 as tradeable };
                export namespace cryptoTradeable_2 {
                    let type_239: string;
                    export { type_239 as type };
                }
                export { cryptoTradeable_2 as cryptoTradeable };
                export namespace corporateActions_2 {
                    let type_240: string;
                    export { type_240 as type };
                    let items_5: {};
                    export { items_5 as items };
                }
                export { corporateActions_2 as corporateActions };
                export namespace exchange_2 {
                    let type_241: string;
                    export { type_241 as type };
                }
                export { exchange_2 as exchange };
                export namespace shortName_2 {
                    let type_242: string;
                    export { type_242 as type };
                }
                export { shortName_2 as shortName };
                export namespace longName_2 {
                    let type_243: string;
                    export { type_243 as type };
                }
                export { longName_2 as longName };
                export namespace messageBoardId_2 {
                    let type_244: string;
                    export { type_244 as type };
                }
                export { messageBoardId_2 as messageBoardId };
                export namespace exchangeTimezoneName_2 {
                    let type_245: string;
                    export { type_245 as type };
                }
                export { exchangeTimezoneName_2 as exchangeTimezoneName };
                export namespace exchangeTimezoneShortName_2 {
                    let type_246: string;
                    export { type_246 as type };
                }
                export { exchangeTimezoneShortName_2 as exchangeTimezoneShortName };
                export namespace gmtOffSetMilliseconds_2 {
                    let type_247: string;
                    export { type_247 as type };
                }
                export { gmtOffSetMilliseconds_2 as gmtOffSetMilliseconds };
                export namespace market_2 {
                    let type_248: string;
                    export { type_248 as type };
                }
                export { market_2 as market };
                export namespace esgPopulated_2 {
                    let type_249: string;
                    export { type_249 as type };
                }
                export { esgPopulated_2 as esgPopulated };
                export namespace fiftyTwoWeekLowChange_2 {
                    let type_250: string;
                    export { type_250 as type };
                }
                export { fiftyTwoWeekLowChange_2 as fiftyTwoWeekLowChange };
                export namespace fiftyTwoWeekLowChangePercent_2 {
                    let type_251: string;
                    export { type_251 as type };
                }
                export { fiftyTwoWeekLowChangePercent_2 as fiftyTwoWeekLowChangePercent };
                export namespace fiftyTwoWeekRange_2 {
                    let $ref_8: string;
                    export { $ref_8 as $ref };
                }
                export { fiftyTwoWeekRange_2 as fiftyTwoWeekRange };
                export namespace fiftyTwoWeekHighChange_2 {
                    let type_252: string;
                    export { type_252 as type };
                }
                export { fiftyTwoWeekHighChange_2 as fiftyTwoWeekHighChange };
                export namespace fiftyTwoWeekHighChangePercent_2 {
                    let type_253: string;
                    export { type_253 as type };
                }
                export { fiftyTwoWeekHighChangePercent_2 as fiftyTwoWeekHighChangePercent };
                export namespace fiftyTwoWeekLow_2 {
                    let type_254: string;
                    export { type_254 as type };
                }
                export { fiftyTwoWeekLow_2 as fiftyTwoWeekLow };
                export namespace fiftyTwoWeekHigh_2 {
                    let type_255: string;
                    export { type_255 as type };
                }
                export { fiftyTwoWeekHigh_2 as fiftyTwoWeekHigh };
                export namespace fiftyTwoWeekChangePercent_2 {
                    let type_256: string;
                    export { type_256 as type };
                }
                export { fiftyTwoWeekChangePercent_2 as fiftyTwoWeekChangePercent };
                export namespace dividendDate_2 {
                    let type_257: string;
                    export { type_257 as type };
                    let format_29: string;
                    export { format_29 as format };
                }
                export { dividendDate_2 as dividendDate };
                export namespace earningsTimestamp_2 {
                    let type_258: string;
                    export { type_258 as type };
                    let format_30: string;
                    export { format_30 as format };
                }
                export { earningsTimestamp_2 as earningsTimestamp };
                export namespace earningsTimestampStart_2 {
                    let type_259: string;
                    export { type_259 as type };
                    let format_31: string;
                    export { format_31 as format };
                }
                export { earningsTimestampStart_2 as earningsTimestampStart };
                export namespace earningsTimestampEnd_2 {
                    let type_260: string;
                    export { type_260 as type };
                    let format_32: string;
                    export { format_32 as format };
                }
                export { earningsTimestampEnd_2 as earningsTimestampEnd };
                export namespace earningsCallTimestampStart_2 {
                    let type_261: string;
                    export { type_261 as type };
                    let format_33: string;
                    export { format_33 as format };
                }
                export { earningsCallTimestampStart_2 as earningsCallTimestampStart };
                export namespace earningsCallTimestampEnd_2 {
                    let type_262: string;
                    export { type_262 as type };
                    let format_34: string;
                    export { format_34 as format };
                }
                export { earningsCallTimestampEnd_2 as earningsCallTimestampEnd };
                export namespace isEarningsDateEstimate_2 {
                    let type_263: string;
                    export { type_263 as type };
                }
                export { isEarningsDateEstimate_2 as isEarningsDateEstimate };
                export namespace trailingAnnualDividendRate_2 {
                    let type_264: string;
                    export { type_264 as type };
                }
                export { trailingAnnualDividendRate_2 as trailingAnnualDividendRate };
                export namespace trailingPE_2 {
                    let type_265: string;
                    export { type_265 as type };
                }
                export { trailingPE_2 as trailingPE };
                export namespace trailingAnnualDividendYield_2 {
                    let type_266: string;
                    export { type_266 as type };
                }
                export { trailingAnnualDividendYield_2 as trailingAnnualDividendYield };
                export namespace epsTrailingTwelveMonths_2 {
                    let type_267: string;
                    export { type_267 as type };
                }
                export { epsTrailingTwelveMonths_2 as epsTrailingTwelveMonths };
                export namespace epsForward_2 {
                    let type_268: string;
                    export { type_268 as type };
                }
                export { epsForward_2 as epsForward };
                export namespace epsCurrentYear_2 {
                    let type_269: string;
                    export { type_269 as type };
                }
                export { epsCurrentYear_2 as epsCurrentYear };
                export namespace priceEpsCurrentYear_2 {
                    let type_270: string;
                    export { type_270 as type };
                }
                export { priceEpsCurrentYear_2 as priceEpsCurrentYear };
                export namespace sharesOutstanding_2 {
                    let type_271: string;
                    export { type_271 as type };
                }
                export { sharesOutstanding_2 as sharesOutstanding };
                export namespace bookValue_2 {
                    let type_272: string;
                    export { type_272 as type };
                }
                export { bookValue_2 as bookValue };
                export namespace fiftyDayAverage_2 {
                    let type_273: string;
                    export { type_273 as type };
                }
                export { fiftyDayAverage_2 as fiftyDayAverage };
                export namespace fiftyDayAverageChange_2 {
                    let type_274: string;
                    export { type_274 as type };
                }
                export { fiftyDayAverageChange_2 as fiftyDayAverageChange };
                export namespace fiftyDayAverageChangePercent_2 {
                    let type_275: string;
                    export { type_275 as type };
                }
                export { fiftyDayAverageChangePercent_2 as fiftyDayAverageChangePercent };
                export namespace twoHundredDayAverage_2 {
                    let type_276: string;
                    export { type_276 as type };
                }
                export { twoHundredDayAverage_2 as twoHundredDayAverage };
                export namespace twoHundredDayAverageChange_2 {
                    let type_277: string;
                    export { type_277 as type };
                }
                export { twoHundredDayAverageChange_2 as twoHundredDayAverageChange };
                export namespace twoHundredDayAverageChangePercent_2 {
                    let type_278: string;
                    export { type_278 as type };
                }
                export { twoHundredDayAverageChangePercent_2 as twoHundredDayAverageChangePercent };
                export namespace marketCap_2 {
                    let type_279: string;
                    export { type_279 as type };
                }
                export { marketCap_2 as marketCap };
                export namespace forwardPE_2 {
                    let type_280: string;
                    export { type_280 as type };
                }
                export { forwardPE_2 as forwardPE };
                export namespace priceToBook_2 {
                    let type_281: string;
                    export { type_281 as type };
                }
                export { priceToBook_2 as priceToBook };
                export namespace sourceInterval_2 {
                    let type_282: string;
                    export { type_282 as type };
                }
                export { sourceInterval_2 as sourceInterval };
                export namespace exchangeDataDelayedBy_2 {
                    let type_283: string;
                    export { type_283 as type };
                }
                export { exchangeDataDelayedBy_2 as exchangeDataDelayedBy };
                export namespace firstTradeDateMilliseconds_2 {
                    let $ref_9: string;
                    export { $ref_9 as $ref };
                }
                export { firstTradeDateMilliseconds_2 as firstTradeDateMilliseconds };
                export namespace priceHint_2 {
                    let type_284: string;
                    export { type_284 as type };
                }
                export { priceHint_2 as priceHint };
                export namespace postMarketChangePercent_2 {
                    let type_285: string;
                    export { type_285 as type };
                }
                export { postMarketChangePercent_2 as postMarketChangePercent };
                export namespace postMarketTime_2 {
                    let type_286: string;
                    export { type_286 as type };
                    let format_35: string;
                    export { format_35 as format };
                }
                export { postMarketTime_2 as postMarketTime };
                export namespace postMarketPrice_2 {
                    let type_287: string;
                    export { type_287 as type };
                }
                export { postMarketPrice_2 as postMarketPrice };
                export namespace postMarketChange_2 {
                    let type_288: string;
                    export { type_288 as type };
                }
                export { postMarketChange_2 as postMarketChange };
                export namespace hasPrePostMarketData_2 {
                    let type_289: string;
                    export { type_289 as type };
                }
                export { hasPrePostMarketData_2 as hasPrePostMarketData };
                export namespace extendedMarketChange_2 {
                    let type_290: string;
                    export { type_290 as type };
                }
                export { extendedMarketChange_2 as extendedMarketChange };
                export namespace extendedMarketChangePercent_2 {
                    let type_291: string;
                    export { type_291 as type };
                }
                export { extendedMarketChangePercent_2 as extendedMarketChangePercent };
                export namespace extendedMarketPrice_2 {
                    let type_292: string;
                    export { type_292 as type };
                }
                export { extendedMarketPrice_2 as extendedMarketPrice };
                export namespace extendedMarketTime_2 {
                    let type_293: string;
                    export { type_293 as type };
                    let format_36: string;
                    export { format_36 as format };
                }
                export { extendedMarketTime_2 as extendedMarketTime };
                export namespace regularMarketChange_2 {
                    let type_294: string;
                    export { type_294 as type };
                }
                export { regularMarketChange_2 as regularMarketChange };
                export namespace regularMarketChangePercent_2 {
                    let type_295: string;
                    export { type_295 as type };
                }
                export { regularMarketChangePercent_2 as regularMarketChangePercent };
                export namespace regularMarketTime_2 {
                    let type_296: string;
                    export { type_296 as type };
                    let format_37: string;
                    export { format_37 as format };
                }
                export { regularMarketTime_2 as regularMarketTime };
                export namespace regularMarketPrice_2 {
                    let type_297: string;
                    export { type_297 as type };
                }
                export { regularMarketPrice_2 as regularMarketPrice };
                export namespace regularMarketDayHigh_2 {
                    let type_298: string;
                    export { type_298 as type };
                }
                export { regularMarketDayHigh_2 as regularMarketDayHigh };
                export namespace regularMarketDayRange_2 {
                    let $ref_10: string;
                    export { $ref_10 as $ref };
                }
                export { regularMarketDayRange_2 as regularMarketDayRange };
                export namespace regularMarketDayLow_2 {
                    let type_299: string;
                    export { type_299 as type };
                }
                export { regularMarketDayLow_2 as regularMarketDayLow };
                export namespace regularMarketVolume_2 {
                    let type_300: string;
                    export { type_300 as type };
                }
                export { regularMarketVolume_2 as regularMarketVolume };
                export namespace dayHigh_2 {
                    let type_301: string;
                    export { type_301 as type };
                }
                export { dayHigh_2 as dayHigh };
                export namespace dayLow_2 {
                    let type_302: string;
                    export { type_302 as type };
                }
                export { dayLow_2 as dayLow };
                export namespace volume_2 {
                    let type_303: string;
                    export { type_303 as type };
                }
                export { volume_2 as volume };
                export namespace regularMarketPreviousClose_2 {
                    let type_304: string;
                    export { type_304 as type };
                }
                export { regularMarketPreviousClose_2 as regularMarketPreviousClose };
                export namespace preMarketChange_2 {
                    let type_305: string;
                    export { type_305 as type };
                }
                export { preMarketChange_2 as preMarketChange };
                export namespace preMarketChangePercent_2 {
                    let type_306: string;
                    export { type_306 as type };
                }
                export { preMarketChangePercent_2 as preMarketChangePercent };
                export namespace preMarketTime_2 {
                    let type_307: string;
                    export { type_307 as type };
                    let format_38: string;
                    export { format_38 as format };
                }
                export { preMarketTime_2 as preMarketTime };
                export namespace preMarketPrice_2 {
                    let type_308: string;
                    export { type_308 as type };
                }
                export { preMarketPrice_2 as preMarketPrice };
                export namespace bid_2 {
                    let type_309: string;
                    export { type_309 as type };
                }
                export { bid_2 as bid };
                export namespace ask_2 {
                    let type_310: string;
                    export { type_310 as type };
                }
                export { ask_2 as ask };
                export namespace bidSize_2 {
                    let type_311: string;
                    export { type_311 as type };
                }
                export { bidSize_2 as bidSize };
                export namespace askSize_2 {
                    let type_312: string;
                    export { type_312 as type };
                }
                export { askSize_2 as askSize };
                export namespace fullExchangeName_2 {
                    let type_313: string;
                    export { type_313 as type };
                }
                export { fullExchangeName_2 as fullExchangeName };
                export namespace financialCurrency_2 {
                    let type_314: string;
                    export { type_314 as type };
                }
                export { financialCurrency_2 as financialCurrency };
                export namespace regularMarketOpen_2 {
                    let type_315: string;
                    export { type_315 as type };
                }
                export { regularMarketOpen_2 as regularMarketOpen };
                export namespace averageDailyVolume3Month_2 {
                    let type_316: string;
                    export { type_316 as type };
                }
                export { averageDailyVolume3Month_2 as averageDailyVolume3Month };
                export namespace averageDailyVolume10Day_2 {
                    let type_317: string;
                    export { type_317 as type };
                }
                export { averageDailyVolume10Day_2 as averageDailyVolume10Day };
                export namespace displayName_2 {
                    let type_318: string;
                    export { type_318 as type };
                }
                export { displayName_2 as displayName };
                export namespace symbol_2 {
                    let type_319: string;
                    export { type_319 as type };
                }
                export { symbol_2 as symbol };
                export namespace underlyingSymbol_3 {
                    let type_320: string;
                    export { type_320 as type };
                }
                export { underlyingSymbol_3 as underlyingSymbol };
                export namespace ytdReturn_2 {
                    let type_321: string;
                    export { type_321 as type };
                }
                export { ytdReturn_2 as ytdReturn };
                export namespace trailingThreeMonthReturns_2 {
                    let type_322: string;
                    export { type_322 as type };
                }
                export { trailingThreeMonthReturns_2 as trailingThreeMonthReturns };
                export namespace trailingThreeMonthNavReturns_2 {
                    let type_323: string;
                    export { type_323 as type };
                }
                export { trailingThreeMonthNavReturns_2 as trailingThreeMonthNavReturns };
                export namespace ipoExpectedDate_2 {
                    let type_324: string;
                    export { type_324 as type };
                    let format_39: string;
                    export { format_39 as format };
                }
                export { ipoExpectedDate_2 as ipoExpectedDate };
                export namespace newListingDate_2 {
                    let type_325: string;
                    export { type_325 as type };
                    let format_40: string;
                    export { format_40 as format };
                }
                export { newListingDate_2 as newListingDate };
                export namespace nameChangeDate_2 {
                    let type_326: string;
                    export { type_326 as type };
                    let format_41: string;
                    export { format_41 as format };
                }
                export { nameChangeDate_2 as nameChangeDate };
                export namespace prevName_2 {
                    let type_327: string;
                    export { type_327 as type };
                }
                export { prevName_2 as prevName };
                export namespace averageAnalystRating_2 {
                    let type_328: string;
                    export { type_328 as type };
                }
                export { averageAnalystRating_2 as averageAnalystRating };
                export namespace pageViewGrowthWeekly_2 {
                    let type_329: string;
                    export { type_329 as type };
                }
                export { pageViewGrowthWeekly_2 as pageViewGrowthWeekly };
                export namespace openInterest_2 {
                    let type_330: string;
                    export { type_330 as type };
                }
                export { openInterest_2 as openInterest };
                export namespace beta_2 {
                    let type_331: string;
                    export { type_331 as type };
                }
                export { beta_2 as beta };
                export namespace companyLogoUrl_2 {
                    let type_332: string;
                    export { type_332 as type };
                }
                export { companyLogoUrl_2 as companyLogoUrl };
                export namespace logoUrl_2 {
                    let type_333: string;
                    export { type_333 as type };
                }
                export { logoUrl_2 as logoUrl };
                export namespace circulatingSupply {
                    let type_334: string;
                    export { type_334 as type };
                }
                export namespace fromCurrency {
                    let type_335: string;
                    export { type_335 as type };
                }
                export namespace toCurrency {
                    let type_336: string;
                    export { type_336 as type };
                }
                export namespace lastMarket {
                    let type_337: string;
                    export { type_337 as type };
                }
                export namespace coinImageUrl {
                    let type_338: string;
                    export { type_338 as type };
                }
                export namespace volume24Hr {
                    let type_339: string;
                    export { type_339 as type };
                }
                export namespace volumeAllCurrencies {
                    let type_340: string;
                    export { type_340 as type };
                }
                export namespace startDate {
                    let type_341: string;
                    export { type_341 as type };
                    let format_42: string;
                    export { format_42 as format };
                }
                export namespace coinMarketCapLink {
                    let type_342: string;
                    export { type_342 as type };
                }
            }
            export { properties_4 as properties };
            let required_5: string[];
            export { required_5 as required };
        }
        export namespace QuoteCurrency {
            let type_343: string;
            export { type_343 as type };
            export namespace properties_5 {
                export namespace language_3 {
                    let type_344: string;
                    export { type_344 as type };
                }
                export { language_3 as language };
                export namespace region_3 {
                    let type_345: string;
                    export { type_345 as type };
                }
                export { region_3 as region };
                export namespace quoteType_3 {
                    let type_346: string;
                    export { type_346 as type };
                    let _const_3: string;
                    export { _const_3 as const };
                }
                export { quoteType_3 as quoteType };
                export namespace typeDisp_3 {
                    let type_347: string;
                    export { type_347 as type };
                }
                export { typeDisp_3 as typeDisp };
                export namespace quoteSourceName_3 {
                    let type_348: string;
                    export { type_348 as type };
                }
                export { quoteSourceName_3 as quoteSourceName };
                export namespace triggerable_3 {
                    let type_349: string;
                    export { type_349 as type };
                }
                export { triggerable_3 as triggerable };
                export namespace currency_3 {
                    let type_350: string;
                    export { type_350 as type };
                }
                export { currency_3 as currency };
                export namespace customPriceAlertConfidence_3 {
                    let type_351: string;
                    export { type_351 as type };
                }
                export { customPriceAlertConfidence_3 as customPriceAlertConfidence };
                export namespace marketState_3 {
                    let type_352: string;
                    export { type_352 as type };
                    let _enum_3: string[];
                    export { _enum_3 as enum };
                }
                export { marketState_3 as marketState };
                export namespace tradeable_3 {
                    let type_353: string;
                    export { type_353 as type };
                }
                export { tradeable_3 as tradeable };
                export namespace cryptoTradeable_3 {
                    let type_354: string;
                    export { type_354 as type };
                }
                export { cryptoTradeable_3 as cryptoTradeable };
                export namespace corporateActions_3 {
                    let type_355: string;
                    export { type_355 as type };
                    let items_6: {};
                    export { items_6 as items };
                }
                export { corporateActions_3 as corporateActions };
                export namespace exchange_3 {
                    let type_356: string;
                    export { type_356 as type };
                }
                export { exchange_3 as exchange };
                export namespace shortName_3 {
                    let type_357: string;
                    export { type_357 as type };
                }
                export { shortName_3 as shortName };
                export namespace longName_3 {
                    let type_358: string;
                    export { type_358 as type };
                }
                export { longName_3 as longName };
                export namespace messageBoardId_3 {
                    let type_359: string;
                    export { type_359 as type };
                }
                export { messageBoardId_3 as messageBoardId };
                export namespace exchangeTimezoneName_3 {
                    let type_360: string;
                    export { type_360 as type };
                }
                export { exchangeTimezoneName_3 as exchangeTimezoneName };
                export namespace exchangeTimezoneShortName_3 {
                    let type_361: string;
                    export { type_361 as type };
                }
                export { exchangeTimezoneShortName_3 as exchangeTimezoneShortName };
                export namespace gmtOffSetMilliseconds_3 {
                    let type_362: string;
                    export { type_362 as type };
                }
                export { gmtOffSetMilliseconds_3 as gmtOffSetMilliseconds };
                export namespace market_3 {
                    let type_363: string;
                    export { type_363 as type };
                }
                export { market_3 as market };
                export namespace esgPopulated_3 {
                    let type_364: string;
                    export { type_364 as type };
                }
                export { esgPopulated_3 as esgPopulated };
                export namespace fiftyTwoWeekLowChange_3 {
                    let type_365: string;
                    export { type_365 as type };
                }
                export { fiftyTwoWeekLowChange_3 as fiftyTwoWeekLowChange };
                export namespace fiftyTwoWeekLowChangePercent_3 {
                    let type_366: string;
                    export { type_366 as type };
                }
                export { fiftyTwoWeekLowChangePercent_3 as fiftyTwoWeekLowChangePercent };
                export namespace fiftyTwoWeekRange_3 {
                    let $ref_11: string;
                    export { $ref_11 as $ref };
                }
                export { fiftyTwoWeekRange_3 as fiftyTwoWeekRange };
                export namespace fiftyTwoWeekHighChange_3 {
                    let type_367: string;
                    export { type_367 as type };
                }
                export { fiftyTwoWeekHighChange_3 as fiftyTwoWeekHighChange };
                export namespace fiftyTwoWeekHighChangePercent_3 {
                    let type_368: string;
                    export { type_368 as type };
                }
                export { fiftyTwoWeekHighChangePercent_3 as fiftyTwoWeekHighChangePercent };
                export namespace fiftyTwoWeekLow_3 {
                    let type_369: string;
                    export { type_369 as type };
                }
                export { fiftyTwoWeekLow_3 as fiftyTwoWeekLow };
                export namespace fiftyTwoWeekHigh_3 {
                    let type_370: string;
                    export { type_370 as type };
                }
                export { fiftyTwoWeekHigh_3 as fiftyTwoWeekHigh };
                export namespace fiftyTwoWeekChangePercent_3 {
                    let type_371: string;
                    export { type_371 as type };
                }
                export { fiftyTwoWeekChangePercent_3 as fiftyTwoWeekChangePercent };
                export namespace dividendDate_3 {
                    let type_372: string;
                    export { type_372 as type };
                    let format_43: string;
                    export { format_43 as format };
                }
                export { dividendDate_3 as dividendDate };
                export namespace earningsTimestamp_3 {
                    let type_373: string;
                    export { type_373 as type };
                    let format_44: string;
                    export { format_44 as format };
                }
                export { earningsTimestamp_3 as earningsTimestamp };
                export namespace earningsTimestampStart_3 {
                    let type_374: string;
                    export { type_374 as type };
                    let format_45: string;
                    export { format_45 as format };
                }
                export { earningsTimestampStart_3 as earningsTimestampStart };
                export namespace earningsTimestampEnd_3 {
                    let type_375: string;
                    export { type_375 as type };
                    let format_46: string;
                    export { format_46 as format };
                }
                export { earningsTimestampEnd_3 as earningsTimestampEnd };
                export namespace earningsCallTimestampStart_3 {
                    let type_376: string;
                    export { type_376 as type };
                    let format_47: string;
                    export { format_47 as format };
                }
                export { earningsCallTimestampStart_3 as earningsCallTimestampStart };
                export namespace earningsCallTimestampEnd_3 {
                    let type_377: string;
                    export { type_377 as type };
                    let format_48: string;
                    export { format_48 as format };
                }
                export { earningsCallTimestampEnd_3 as earningsCallTimestampEnd };
                export namespace isEarningsDateEstimate_3 {
                    let type_378: string;
                    export { type_378 as type };
                }
                export { isEarningsDateEstimate_3 as isEarningsDateEstimate };
                export namespace trailingAnnualDividendRate_3 {
                    let type_379: string;
                    export { type_379 as type };
                }
                export { trailingAnnualDividendRate_3 as trailingAnnualDividendRate };
                export namespace trailingPE_3 {
                    let type_380: string;
                    export { type_380 as type };
                }
                export { trailingPE_3 as trailingPE };
                export namespace trailingAnnualDividendYield_3 {
                    let type_381: string;
                    export { type_381 as type };
                }
                export { trailingAnnualDividendYield_3 as trailingAnnualDividendYield };
                export namespace epsTrailingTwelveMonths_3 {
                    let type_382: string;
                    export { type_382 as type };
                }
                export { epsTrailingTwelveMonths_3 as epsTrailingTwelveMonths };
                export namespace epsForward_3 {
                    let type_383: string;
                    export { type_383 as type };
                }
                export { epsForward_3 as epsForward };
                export namespace epsCurrentYear_3 {
                    let type_384: string;
                    export { type_384 as type };
                }
                export { epsCurrentYear_3 as epsCurrentYear };
                export namespace priceEpsCurrentYear_3 {
                    let type_385: string;
                    export { type_385 as type };
                }
                export { priceEpsCurrentYear_3 as priceEpsCurrentYear };
                export namespace sharesOutstanding_3 {
                    let type_386: string;
                    export { type_386 as type };
                }
                export { sharesOutstanding_3 as sharesOutstanding };
                export namespace bookValue_3 {
                    let type_387: string;
                    export { type_387 as type };
                }
                export { bookValue_3 as bookValue };
                export namespace fiftyDayAverage_3 {
                    let type_388: string;
                    export { type_388 as type };
                }
                export { fiftyDayAverage_3 as fiftyDayAverage };
                export namespace fiftyDayAverageChange_3 {
                    let type_389: string;
                    export { type_389 as type };
                }
                export { fiftyDayAverageChange_3 as fiftyDayAverageChange };
                export namespace fiftyDayAverageChangePercent_3 {
                    let type_390: string;
                    export { type_390 as type };
                }
                export { fiftyDayAverageChangePercent_3 as fiftyDayAverageChangePercent };
                export namespace twoHundredDayAverage_3 {
                    let type_391: string;
                    export { type_391 as type };
                }
                export { twoHundredDayAverage_3 as twoHundredDay