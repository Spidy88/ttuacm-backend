import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactComponent } from './contact.component';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ContactService } from '../../services/contact.service';
import { HttpClientModule, HttpClient, HttpHandler } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../user-auth/services/auth.service';
import { UserStateService } from '../../../../shared/services/user-state.service';
import { MaterialModule } from '../../../../shared/material.module';
import { MatSnackBar } from '@angular/material';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContactComponent ],
      imports: [
        RouterTestingModule,
        BrowserAnimationsModule,
        MaterialModule
      ],
      providers: [
        ContactService,
        AuthService,
        HttpClient,
        HttpHandler,
        UserStateService,
        MatSnackBar
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});