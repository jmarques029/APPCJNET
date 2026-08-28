
import { InMemoryObservationRepository } from "@/infra/InMemoryObservationRepository";
import { ListObservations } from "@/usecases/ListObservations";
import { RegisterObservation } from "@/usecases/RegisterObservation";



class Container {
    private static instance: Container;
    public readonly inMemoryObservationRepository: InMemoryObservationRepository
    public readonly registerObservation: RegisterObservation
    public readonly listObservations: ListObservations

    private constructor() {
        this.inMemoryObservationRepository = InMemoryObservationRepository.getInstance();
        this.registerObservation = new RegisterObservation(this.inMemoryObservationRepository);
        this.listObservations = new ListObservations(this.inMemoryObservationRepository);
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return this.instance;
    }
}

export const container = Container.getInstance();