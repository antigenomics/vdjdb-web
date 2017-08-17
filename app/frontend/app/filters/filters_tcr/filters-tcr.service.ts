import { Injectable } from '@angular/core';

export class FilterTCRGeneral {
    species: FilterTCRGeneralSpecies = new FilterTCRGeneralSpecies();
    gene: FilterTCRGeneralGene = new FilterTCRGeneralGene();
}

export class FilterTCRGeneralSpecies {
    human: boolean = true;
    monkey: boolean = true;
    mouse: boolean = true;
}

export class FilterTCRGeneralGene {
    tra: boolean = false;
    trb: boolean = true;
    pairedOnly: boolean = false;
}

@Injectable()
export class FiltersTCRService {
    general: FilterTCRGeneral = new FilterTCRGeneral();
}