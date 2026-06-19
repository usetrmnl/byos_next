declare module "ical-expander" {
	type IcalDateLike = {
		toJSDate(): Date;
		isDate: boolean;
	};

	type IcalEvent = {
		startDate: IcalDateLike;
		endDate: IcalDateLike;
		summary?: string;
	};

	type IcalOccurrence = {
		startDate: IcalDateLike;
		endDate: IcalDateLike;
		item: { summary?: string };
	};

	export default class IcalExpander {
		constructor(options: { ics: string; maxIterations?: number });
		between(start: Date, end: Date): {
			events: IcalEvent[];
			occurrences: IcalOccurrence[];
		};
	}
}
