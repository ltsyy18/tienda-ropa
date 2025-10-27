import { TestBed } from '@angular/core/testing';

import { Checktout } from './checktout';

describe('Checktout', () => {
  let service: Checktout;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Checktout);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
